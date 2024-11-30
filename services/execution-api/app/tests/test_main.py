import unittest
from unittest.mock import MagicMock
from main import handles_callbacks

from ..models import JobStatus
from ..handlers import update_job_status_in_workflow_in_db, update_workflow_log_file, add_job_state_to_workflow_in_db
from ..main import WORKFLOW_LOG_PATH

class TestAPI(unittest.TestCase):
    def test_handles_callbacks_completed(self):
        # Create a mock JobState object with job_status = JobStatus.completed
        job = MagicMock()
        job.job_status = JobStatus.completed

        # Call the API function
        handles_callbacks("workflow_id", job)

        # Assert that the appropriate functions are called
        update_job_status_in_workflow_in_db.assert_called_with(workflow_id="workflow_id", job_state=job)
        update_workflow_log_file.assert_called_with(WORKFLOW_LOG_PATH, "workflow_id", job)

    def test_handles_callbacks_awaiting_interaction(self):
        # Create a mock JobState object with job_status = JobStatus.awaiting_interaction
        job = MagicMock()
        job.job_status = JobStatus.awaiting_interaction

        # Call the API function
        handles_callbacks("workflow_id", job)

        # Assert that the appropriate functions are called
        update_job_status_in_workflow_in_db.assert_called_with(workflow_id="workflow_id", job_state=job)

    def test_handles_callbacks_submitted(self):
        # Create a mock JobState object with job_status = JobStatus.submitted
        job = MagicMock()
        job.job_status = JobStatus.submitted

        # Call the API function
        handles_callbacks("workflow_id", job)

        # Assert that the appropriate functions are called
        add_job_state_to_workflow_in_db.assert_called_with(workflow_id="workflow_id", job_state=job)

    def test_handles_callbacks_accepted(self):
        # Create a mock JobState object with job_status = JobStatus.accepted
        job = MagicMock()
        job.job_status = JobStatus.accepted

        # Call the API function
        handles_callbacks("workflow_id", job)

        # Assert that the appropriate functions are called
        update_job_status_in_workflow_in_db.assert_called_with(workflow_id="workflow_id", job_state=job)

    def test_handles_callbacks_interaction_accepted(self):
        # Create a mock JobState object with job_status = JobStatus.interaction_accepted
        job = MagicMock()
        job.job_status = JobStatus.interaction_accepted

        # Call the API function
        handles_callbacks("workflow_id", job)

        # Assert that the appropriate functions are called
        update_job_status_in_workflow_in_db.assert_called_with(workflow_id="workflow_id", job_state=job)

    def test_handles_callbacks_processing(self):
        # Create a mock JobState object with job_status = JobStatus.processing
        job = MagicMock()
        job.job_status = JobStatus.processing

        # Call the API function
        handles_callbacks("workflow_id", job)

        # Assert that the appropriate functions are called
        update_job_status_in_workflow_in_db.assert_called_with(workflow_id="workflow_id", job_state=job)

    def test_handles_callbacks_failed(self):
        # Create a mock JobState object with job_status = JobStatus.failed
        job = MagicMock()
        job.job_status = JobStatus.failed

        # Call the API function
        handles_callbacks("workflow_id", job)

        # Assert that no functions are called
        update_job_status_in_workflow_in_db.assert_not_called()

if __name__ == '__main__':
    unittest.main()