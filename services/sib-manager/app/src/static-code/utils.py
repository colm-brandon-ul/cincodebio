def create_redirect_to_execution_env_link(job_id: str, base_url: str, execution_ingress_path: str):
    return f"{str(base_url)}app/workflows/{job_id}"