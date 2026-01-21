# ECS Service Infrastructure for Rady GenAI

# Get available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# Public Subnets
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "rady-genai-public-1"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true

  tags = {
    Name = "rady-genai-public-2"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "rady-genai-igw"
  }
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "rady-genai-public-rt"
  }
}

resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

# Security Group for ALB
resource "aws_security_group" "alb" {
  name        = "rady-genai-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "rady-genai-alb-sg"
  }
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "rady-genai-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "rady-genai-ecs-tasks-sg"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "rady-genai-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = {
    Name = "rady-genai-alb"
  }
}

# Target Group for Backend
resource "aws_lb_target_group" "backend" {
  name        = "rady-genai-backend-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  tags = {
    Name = "rady-genai-backend-tg"
  }
}

# ALB Listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/rady-backend"
  retention_in_days = 30

  tags = {
    Name = "rady-genai-backend-logs"
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution" {
  name = "rady-genai-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "rady-genai-ecs-task-execution"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Policy to allow ECS to read secrets from Secrets Manager
resource "aws_iam_role_policy" "ecs_secrets_access" {
  name = "rady-genai-secrets-access"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:us-east-1:137738968757:secret:rady-genai/*"
        ]
      }
    ]
  })
}

# ECS Task Definition for Backend
resource "aws_ecs_task_definition" "backend" {
  family                   = "rady-genai-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name  = "backend"
      image = "${aws_ecr_repository.backend.repository_url}:latest"
      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "LANGFUSE_PUBLIC_KEY"
          value = "pk-lf-489be8c6-e0aa-4c6b-807f-b9e4fb0e8e1e"
        },
        {
          name  = "LANGFUSE_SECRET_KEY"
          value = "sk-lf-97df7378-d074-4e5c-a79b-6f2c8bc8fad1"
        },
        {
          name  = "LANGFUSE_HOST"
          value = "http://${aws_lb.main.dns_name}:3001"
        },
        {
          name  = "AWS_MONITORING_ENABLED"
          value = "true"
        },
        {
          name  = "AWS_REGION"
          value = "us-east-1"
        },
        {
          name  = "OTEL_ENABLED"
          value = "true"
        },
        {
          name  = "OTEL_EXPORTER_OTLP_ENDPOINT"
          value = "http://${aws_lb.main.dns_name}:4318"
        }
      ]
      secrets = [
        {
          name      = "OPENAI_API_KEY"
          valueFrom = "arn:aws:secretsmanager:us-east-1:137738968757:secret:rady-genai/openai-api-key-dxCcjn"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "rady-genai-backend-task"
  }
}

# ECS Service for Backend
resource "aws_ecs_service" "backend" {
  name            = "rady-genai-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Wait 2 minutes before starting health checks (container startup time)
  health_check_grace_period_seconds = 120

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name = "rady-genai-backend-service"
  }
}

# ==================== FRONTEND ====================

# Target Group for Frontend
resource "aws_lb_target_group" "frontend" {
  name        = "rady-genai-frontend-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200-399"
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 10
    unhealthy_threshold = 3
  }

  tags = {
    Name = "rady-genai-frontend-tg"
  }
}

# CloudWatch Log Group for Frontend
resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/rady-frontend"
  retention_in_days = 30

  tags = {
    Name = "rady-genai-frontend-logs"
  }
}

# ECS Task Definition for Frontend
resource "aws_ecs_task_definition" "frontend" {
  family                   = "rady-genai-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name  = "frontend"
      image = "${aws_ecr_repository.frontend.repository_url}:latest"
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "NEXT_PUBLIC_API_URL"
          value = "http://${aws_lb.main.dns_name}"
        },
        {
          name  = "BACKEND_URL"
          value = "http://${aws_lb.main.dns_name}"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "rady-genai-frontend-task"
  }
}

# ECS Service for Frontend
resource "aws_ecs_service" "frontend" {
  name            = "rady-genai-frontend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Wait 60 seconds before starting health checks (container startup time)
  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.frontend]

  tags = {
    Name = "rady-genai-frontend-service"
  }
}

# ALB Listener for Frontend (port 3000 externally mapped to 80)
resource "aws_lb_listener" "frontend" {
  load_balancer_arn = aws_lb.main.arn
  port              = "3000"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}
