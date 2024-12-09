import asyncio
import uuid
import atexit
import psutil
import tempfile
import os
from fastapi.exceptions import HTTPException
import handlers
import os
from config import WORKFLOW_LOG_PATH


class ProcessManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ProcessManager, cls).__new__(cls)
            cls._instance.processes = {}
            cls._instance._stopped_processes = {}
            atexit.register(cls._instance.cleanup)
        return cls._instance

    async def start_process(self, command: list) -> str:
        process_id = str(uuid.uuid4())
        command.append(f'-p={process_id}')
        handlers.create_workflow_log_file(os.getcwd(),process_id)
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            self.processes[process_id] = process
            return process_id
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to start process: {e}")

    async def start_process_from_code(self, code: str) -> str:
        """Create temporary file, write code, execute, then delete file."""
        try:
            # Create temporary Python file
            handlers.create_logs_directory(WORKFLOW_LOG_PATH)
            handlers.create_workflow_log_file(WORKFLOW_LOG_PATH,process_id)

            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as tmp:
                tmp.write(code)
                tmp_path = tmp.name

            # Start process using temp file
            process_id = await self.start_process(['python', tmp_path])

            # Wait briefly for the process to initialize
            await asyncio.sleep(0.1)

            return process_id
        except Exception as e:
            # Clean up temp file if creation/execution fails
            if 'tmp_path' in locals():
                os.unlink(tmp_path)
            raise HTTPException(status_code=500, detail=f"Failed to start process: {e}")

    async def stop_process(self, process_id: str) -> bool:
        process = self.processes.get(process_id)
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")
        
        if process.returncode is not None:
            self.processes.pop(process_id, None)
            return True

        process.terminate()
        try:
            await asyncio.wait_for(process.wait(), timeout=5)
        except asyncio.TimeoutError:
            process.kill()
        self.processes.pop(process_id, None)
        return True

    async def get_process_status(self, process_id: str, get_std: bool = False) -> dict:
        process = self.processes.get(process_id)
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")

        if get_std:
            stdout = await process.stdout.read() if process.stdout else None
            stderr = await process.stderr.read() if process.stderr else None

            return {
                'pid': process.pid,
                'running': process.returncode is None,
                'returncode': process.returncode,
                'stdout': stdout.decode() if stdout else None,
                'stderr': stderr.decode() if stderr else None,
            }

        return {
            'pid': process.pid,
            'running': process.returncode is None,
            'returncode': process.returncode,
        }

    async def get_process_memory(self, process_id: str):
        process = self.processes.get(process_id)
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")

        try:
            ps_process = psutil.Process(process.pid)
            memory = ps_process.memory_info()
            return {
                'rss': {
                    'bytes': memory.rss,
                    'mb': memory.rss / 1024 / 1024,
                    'description': 'Actual physical memory being used'
                },
                'vms': {
                    'bytes': memory.vms,
                    'mb': memory.vms / 1024 / 1024,
                    'description': 'Total virtual memory allocated'
                }
            }
        except psutil.NoSuchProcess:
            return None
    
    async def job_callback(self, process_id: str, job_id: str) -> None:
        handlers.update_workflow_log_file(WORKFLOW_LOG_PATH,process_id, job_id=job_id)
        
    def cleanup(self):
        for process_id, process in list(self.processes.items()):
            if process:
                process.terminate()