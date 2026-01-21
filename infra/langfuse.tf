# ==================== LANGFUSE SELF-HOSTED ON AWS ====================
# This file creates the infrastructure for self-hosted LangFuse on AWS ECS
# Enable by setting: langfuse_enabled = true in terraform.tfvars

# Private Subnets for RDS (database should not be publicly accessible)
resource "aws_subnet" "private_1" {
  count             = var.langfuse_enabled ? 1 : 0
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name = "${var.project_name}-private-1"
  }
}

resource "aws_subnet" "private_2" {
  count             = var.langfuse_enabled ? 1 : 0
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name = "${var.project_name}-private-2"
  }
}

# Route table for private subnets (local VPC routing only)
resource "aws_route_table" "private" {
  count  = var.langfuse_enabled ? 1 : 0
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "10.0.0.0/16"
    gateway_id = "local"
  }

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

resource "aws_route_table_association" "private_1" {
  count          = var.langfuse_enabled ? 1 : 0
  subnet_id      = aws_subnet.private_1[0].id
  route_table_id = aws_route_table.private[0].id
}

resource "aws_route_table_association" "private_2" {
  count          = var.langfuse_enabled ? 1 : 0
  subnet_id      = aws_subnet.private_2[0].id
  route_table_id = aws_route_table.private[0].id
}

# DB Subnet Group
resource "aws_db_subnet_group" "langfuse" {
  count      = var.langfuse_enabled ? 1 : 0
  name       = "${var.project_name}-langfuse-db-subnet"
  subnet_ids = [aws_subnet.private_1[0].id, aws_subnet.private_2[0].id]

  tags = {
    Name = "${var.project_name}-langfuse-db-subnet"
  }
}

# Security Group for LangFuse ECS Task (defined before DB SG to avoid circular dependency)
resource "aws_security_group" "langfuse_ecs" {
  count       = var.langfuse_enabled ? 1 : 0
  name        = "${var.project_name}-langfuse-ecs-sg"
  description = "Security group for LangFuse ECS task"
  vpc_id      = aws_vpc.main.id

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
    Name = "${var.project_name}-langfuse-ecs-sg"
  }
}

# Security Group for LangFuse Database
resource "aws_security_group" "langfuse_db" {
  count       = var.langfuse_enabled ? 1 : 0
  name        = "${var.project_name}-langfuse-db-sg"
  description = "Security group for LangFuse PostgreSQL database"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.langfuse_ecs[0].id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-langfuse-db-sg"
  }
}

# RDS PostgreSQL for LangFuse
resource "aws_db_instance" "langfuse" {
  count                  = var.langfuse_enabled ? 1 : 0
  identifier             = "${var.project_name}-langfuse-db"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = var.langfuse_db_instance_class
  allocated_storage      = var.langfuse_db_allocated_storage
  storage_type           = "gp2"
  db_name                = "langfuse"
  username               = "langfuse"
  password               = random_password.langfuse_db[0].result
  db_subnet_group_name   = aws_db_subnet_group.langfuse[0].name
  vpc_security_group_ids = [aws_security_group.langfuse_db[0].id]
  skip_final_snapshot    = true
  publicly_accessible    = false

  tags = {
    Name = "${var.project_name}-langfuse-db"
  }
}

# Random password for LangFuse database
resource "random_password" "langfuse_db" {
  count   = var.langfuse_enabled ? 1 : 0
  length  = 32
  special = false
}

# Random secrets for LangFuse
resource "random_password" "langfuse_nextauth_secret" {
  count   = var.langfuse_enabled ? 1 : 0
  length  = 64
  special = false
}

resource "random_password" "langfuse_salt" {
  count   = var.langfuse_enabled ? 1 : 0
  length  = 64
  special = false
}

# Store LangFuse secrets in Secrets Manager
resource "aws_secretsmanager_secret" "langfuse" {
  count = var.langfuse_enabled ? 1 : 0
  name  = "${var.project_name}/langfuse-secrets"

  tags = {
    Name = "${var.project_name}-langfuse-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "langfuse" {
  count     = var.langfuse_enabled ? 1 : 0
  secret_id = aws_secretsmanager_secret.langfuse[0].id
  secret_string = jsonencode({
    DATABASE_URL      = "postgresql://langfuse:${random_password.langfuse_db[0].result}@${aws_db_instance.langfuse[0].endpoint}/langfuse"
    NEXTAUTH_SECRET   = random_password.langfuse_nextauth_secret[0].result
    SALT              = random_password.langfuse_salt[0].result
  })
}

# CloudWatch Log Group for LangFuse
resource "aws_cloudwatch_log_group" "langfuse" {
  count             = var.langfuse_enabled ? 1 : 0
  name              = "/ecs/${var.project_name}-langfuse"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-langfuse-logs"
  }
}

# ECS Task Definition for LangFuse
resource "aws_ecs_task_definition" "langfuse" {
  count                    = var.langfuse_enabled ? 1 : 0
  family                   = "${var.project_name}-langfuse"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name  = "langfuse"
      image = "langfuse/langfuse:2"
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "NEXTAUTH_URL"
          value = "http://${aws_lb.main.dns_name}:3001"
        },
        {
          name  = "HOSTNAME"
          value = "0.0.0.0"
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "TELEMETRY_ENABLED"
          value = "false"
        }
      ]
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${aws_secretsmanager_secret.langfuse[0].arn}:DATABASE_URL::"
        },
        {
          name      = "NEXTAUTH_SECRET"
          valueFrom = "${aws_secretsmanager_secret.langfuse[0].arn}:NEXTAUTH_SECRET::"
        },
        {
          name      = "SALT"
          valueFrom = "${aws_secretsmanager_secret.langfuse[0].arn}:SALT::"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.langfuse[0].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-langfuse-task"
  }
}

# Target Group for LangFuse
resource "aws_lb_target_group" "langfuse" {
  count       = var.langfuse_enabled ? 1 : 0
  name        = "${var.project_name}-langfuse-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 60
    matcher             = "200-399"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 30
    unhealthy_threshold = 5
  }

  tags = {
    Name = "${var.project_name}-langfuse-tg"
  }
}

# ALB Listener for LangFuse (port 3001)
resource "aws_lb_listener" "langfuse" {
  count             = var.langfuse_enabled ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = "3001"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.langfuse[0].arn
  }
}

# ECS Service for LangFuse
resource "aws_ecs_service" "langfuse" {
  count           = var.langfuse_enabled ? 1 : 0
  name            = "${var.project_name}-langfuse-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.langfuse[0].arn
  desired_count   = 1
  launch_type     = "FARGATE"

  health_check_grace_period_seconds = 300

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.langfuse_ecs[0].id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.langfuse[0].arn
    container_name   = "langfuse"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.langfuse[0], aws_db_instance.langfuse[0]]

  tags = {
    Name = "${var.project_name}-langfuse-service"
  }
}

# Update ALB security group to allow LangFuse port
resource "aws_security_group_rule" "alb_langfuse" {
  count             = var.langfuse_enabled ? 1 : 0
  type              = "ingress"
  from_port         = 3001
  to_port           = 3001
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb.id
}

# IAM policy to allow ECS to read LangFuse secrets
resource "aws_iam_role_policy" "ecs_langfuse_secrets" {
  count = var.langfuse_enabled ? 1 : 0
  name  = "${var.project_name}-langfuse-secrets-access"
  role  = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.langfuse[0].arn
        ]
      }
    ]
  })
}
