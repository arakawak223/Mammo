# ─── AWS Secrets Manager ───

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.project_name}/${var.environment}/jwt-secret"
  description = "JWT signing secret for MamoriTalk API"
}

resource "aws_secretsmanager_secret" "database_url" {
  name        = "${var.project_name}/${var.environment}/database-url"
  description = "PostgreSQL connection string for MamoriTalk API"
}

# ─── IAM Policy: ECS が Secrets Manager を読める権限 ───

resource "aws_iam_policy" "ecs_secrets_access" {
  name = "${var.project_name}-${var.environment}-ecs-secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue",
      ]
      Resource = [
        aws_secretsmanager_secret.jwt_secret.arn,
        aws_secretsmanager_secret.database_url.arn,
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_secrets" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = aws_iam_policy.ecs_secrets_access.arn
}
