import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import { ExportDispatcher } from './export-dispatcher.interface';
import {
  EXPORT_JOB_ID_ENV_KEY,
  GCP_PROJECT_ID_ENV_KEY,
  GCP_REGION_ENV_KEY,
  MUSIC_EXPORT_JOB_NAME_ENV_KEY,
  CLOUD_RUN_JOB_NOT_CONFIGURED_MESSAGE,
} from './music-export.constants';

const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const RUN_API_BASE = 'https://run.googleapis.com/v2';

// cloud-run-job mode: start a one-shot Cloud Run Job execution that runs
// src/music-export-job.ts with EXPORT_JOB_ID pointing at this row. Auth is
// Application Default Credentials — the API service account needs
// run.jobs.run on the target job.
@Injectable()
export class CloudRunJobExportDispatcher implements ExportDispatcher {
  private readonly logger = new Logger(CloudRunJobExportDispatcher.name);
  private readonly auth = new GoogleAuth({ scopes: CLOUD_PLATFORM_SCOPE });

  constructor(private readonly config: ConfigService) {}

  async dispatch(exportJobId: string): Promise<void> {
    const { project, region, jobName } = this.requireConfig();

    const url =
      `${RUN_API_BASE}/projects/${project}/locations/${region}` +
      `/jobs/${jobName}:run`;
    const body = {
      overrides: {
        containerOverrides: [
          { env: [{ name: EXPORT_JOB_ID_ENV_KEY, value: exportJobId }] },
        ],
      },
    };

    const token = await this.auth.getAccessToken();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(
        `Cloud Run Job run failed (${response.status}): ${detail}`,
      );
      throw new Error(`Cloud Run Job run failed with ${response.status}`);
    }
  }

  private requireConfig(): {
    project: string;
    region: string;
    jobName: string;
  } {
    const project = this.config.get<string>(GCP_PROJECT_ID_ENV_KEY);
    const region = this.config.get<string>(GCP_REGION_ENV_KEY);
    const jobName = this.config.get<string>(MUSIC_EXPORT_JOB_NAME_ENV_KEY);
    if (!project || !region || !jobName) {
      throw new Error(CLOUD_RUN_JOB_NOT_CONFIGURED_MESSAGE);
    }
    return { project, region, jobName };
  }
}
