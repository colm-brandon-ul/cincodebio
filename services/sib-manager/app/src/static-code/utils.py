def create_redirect_to_execution_env_link(job_id: str, base_url: str, execution_ingress_path: str):
    return f"http://{base_url}{execution_ingress_path}/frontend/{job_id}"