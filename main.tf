data "aws_route53_zone" "horbin_ski" {
  name = "horbin.ski."
}

resource "aws_route53_record" "github_pages_tripp_horbin_ski_a" {
  zone_id = data.aws_route53_zone.horbin_ski.zone_id
  name    = "horbin.ski"
  type    = "A"
  ttl     = 300
  records = [
    "185.199.108.153",
    "185.199.109.153",
    "185.199.110.153",
    "185.199.111.153"
  ]
}

resource "aws_route53_record" "github_pages_tripp_horbin_ski_aaaa" {
  zone_id = data.aws_route53_zone.horbin_ski.zone_id
  name    = "horbin.ski"
  type    = "AAAA"
  ttl     = 300
  records = [
    "2606:50c0:8000::153",
    "2606:50c0:8001::153",
    "2606:50c0:8002::153",
    "2606:50c0:8003::153"
  ]
}

resource "aws_route53_record" "github_pages_tripp_horbin_ski_cname" {
  zone_id = data.aws_route53_zone.horbin_ski.zone_id
  name    = "tripp.horbin.ski"
  type    = "CNAME"
  ttl     = 300
  records = ["tripp-horbinski.github.io."]
}

resource "aws_acm_certificate" "tripp_horbin_ski" {
  domain_name       = "tripp.horbin.ski"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}