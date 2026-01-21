# ==================== JAEGER & GRAFANA ON AWS ECS ====================
# Self-hosted monitoring stack for distributed tracing and metrics visualization

# ==================== JAEGER ====================

# CloudWatch Log Group for Jaeger
resource "aws_cloudwatch_log_group" "jaeger" {
  name              = "/ecs/rady-genai-jaeger"
  retention_in_days = 14

  tags = {
    Name = "rady-genai-jaeger-logs"
  }
}

# ECS Task Definition for Jaeger
resource "aws_ecs_task_definition" "jaeger" {
  family                   = "rady-genai-jaeger"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name  = "jaeger"
      image = "jaegertracing/all-in-one:1.52"
      portMappings = [
        {
          containerPort = 16686
          protocol      = "tcp"
        },
        {
          containerPort = 4317
          protocol      = "tcp"
        },
        {
          containerPort = 4318
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "COLLECTOR_OTLP_ENABLED"
          value = "true"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.jaeger.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "rady-genai-jaeger-task"
  }
}

# Security Group for Jaeger
resource "aws_security_group" "jaeger" {
  name        = "${var.project_name}-jaeger-sg"
  description = "Security group for Jaeger"
  vpc_id      = aws_vpc.main.id

  # Jaeger UI
  ingress {
    from_port       = 16686
    to_port         = 16686
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # OTLP gRPC
  ingress {
    from_port       = 4317
    to_port         = 4317
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  # OTLP HTTP
  ingress {
    from_port       = 4318
    to_port         = 4318
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-jaeger-sg"
  }
}

# Target Group for Jaeger UI
resource "aws_lb_target_group" "jaeger" {
  name        = "${var.project_name}-jaeger-tg"
  port        = 16686
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  tags = {
    Name = "${var.project_name}-jaeger-tg"
  }
}

# Target Group for Jaeger OTLP HTTP (port 4318)
resource "aws_lb_target_group" "jaeger_otlp" {
  name        = "${var.project_name}-jaeger-otlp-tg"
  port        = 4318
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200-405"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  tags = {
    Name = "${var.project_name}-jaeger-otlp-tg"
  }
}

# ALB Listener for Jaeger UI (port 16686)
resource "aws_lb_listener" "jaeger" {
  load_balancer_arn = aws_lb.main.arn
  port              = "16686"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.jaeger.arn
  }
}

# ALB Listener for Jaeger OTLP HTTP (port 4318)
resource "aws_lb_listener" "jaeger_otlp" {
  load_balancer_arn = aws_lb.main.arn
  port              = "4318"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.jaeger_otlp.arn
  }
}

# ECS Service for Jaeger
resource "aws_ecs_service" "jaeger" {
  name            = "${var.project_name}-jaeger-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.jaeger.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.jaeger.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.jaeger.arn
    container_name   = "jaeger"
    container_port   = 16686
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.jaeger_otlp.arn
    container_name   = "jaeger"
    container_port   = 4318
  }

  depends_on = [aws_lb_listener.jaeger, aws_lb_listener.jaeger_otlp]

  tags = {
    Name = "${var.project_name}-jaeger-service"
  }
}

# ==================== GRAFANA ====================

# CloudWatch Log Group for Grafana
resource "aws_cloudwatch_log_group" "grafana" {
  name              = "/ecs/rady-genai-grafana"
  retention_in_days = 14

  tags = {
    Name = "rady-genai-grafana-logs"
  }
}

# ECS Task Definition for Grafana
resource "aws_ecs_task_definition" "grafana" {
  family                   = "rady-genai-grafana"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name  = "grafana"
      image = "grafana/grafana:10.2.0"
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "GF_SECURITY_ADMIN_USER"
          value = "admin"
        },
        {
          name  = "GF_SECURITY_ADMIN_PASSWORD"
          value = "admin"
        },
        {
          name  = "GF_SERVER_ROOT_URL"
          value = "http://${aws_lb.main.dns_name}:3002"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.grafana.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "rady-genai-grafana-task"
  }
}

# Security Group for Grafana
resource "aws_security_group" "grafana" {
  name        = "${var.project_name}-grafana-sg"
  description = "Security group for Grafana"
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
    Name = "${var.project_name}-grafana-sg"
  }
}

# Target Group for Grafana
resource "aws_lb_target_group" "grafana" {
  name        = "${var.project_name}-grafana-tg"
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
    timeout             = 5
    unhealthy_threshold = 3
  }

  tags = {
    Name = "${var.project_name}-grafana-tg"
  }
}

# ALB Listener for Grafana (port 3002)
resource "aws_lb_listener" "grafana" {
  load_balancer_arn = aws_lb.main.arn
  port              = "3002"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.grafana.arn
  }
}

# ECS Service for Grafana
resource "aws_ecs_service" "grafana" {
  name            = "${var.project_name}-grafana-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.grafana.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.grafana.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.grafana.arn
    container_name   = "grafana"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.grafana]

  tags = {
    Name = "${var.project_name}-grafana-service"
  }
}

# ==================== ALB SECURITY GROUP RULES ====================

# Allow Jaeger UI port
resource "aws_security_group_rule" "alb_jaeger" {
  type              = "ingress"
  from_port         = 16686
  to_port           = 16686
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb.id
}

# Allow Jaeger OTLP HTTP port
resource "aws_security_group_rule" "alb_jaeger_otlp" {
  type              = "ingress"
  from_port         = 4318
  to_port           = 4318
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb.id
}

# Allow Grafana port
resource "aws_security_group_rule" "alb_grafana" {
  type              = "ingress"
  from_port         = 3002
  to_port           = 3002
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb.id
}

# ==================== OUTPUTS ====================

output "jaeger_url" {
  description = "URL for Jaeger UI"
  value       = "http://${aws_lb.main.dns_name}:16686"
}

output "grafana_url" {
  description = "URL for Grafana"
  value       = "http://${aws_lb.main.dns_name}:3002"
}
