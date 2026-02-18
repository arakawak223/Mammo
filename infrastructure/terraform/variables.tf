variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "mamoritalk"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "mamori_talk"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "mamori"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "api_cpu" {
  description = "Fargate CPU units for API service"
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "Fargate memory (MiB) for API service"
  type        = number
  default     = 512
}

variable "ai_cpu" {
  description = "Fargate CPU units for AI service"
  type        = number
  default     = 512
}

variable "ai_memory" {
  description = "Fargate memory (MiB) for AI service"
  type        = number
  default     = 1024
}
