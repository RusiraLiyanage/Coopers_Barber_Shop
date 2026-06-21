import { Alert, Space, Typography } from 'antd';

import { SACard } from '../../../components/common';
import type { BarberRecord, ServiceAiConfigRecord } from '../../../lib/api';

type OverviewStat = {
  label: string;
  value: number;
};

type OverviewTabProps = {
  overviewStats: OverviewStat[];
  servicesMissingSkills: ServiceAiConfigRecord[];
  barbersMissingSkills: BarberRecord[];
};

export function OverviewTab({
  overviewStats,
  servicesMissingSkills,
  barbersMissingSkills,
}: OverviewTabProps) {
  const hasSetupGaps =
    servicesMissingSkills.length > 0 || barbersMissingSkills.length > 0;

  return (
    <Space direction="vertical" size={20} className="admin-full-width">
      <Alert
        type="info"
        showIcon
        message="Admin setup order"
        description="Keep barber profiles, service matching rules, and safety rules current. New client consultations create appointment briefs here so staff can prepare before the visit."
      />
      <div className="admin-overview-grid">
        {overviewStats.map((stat) => (
          <SACard key={stat.label} bodyPadding={20}>
            <div className="admin-stat-card">
              <Typography.Text type="secondary">{stat.label}</Typography.Text>
              <Typography.Title level={2}>{stat.value}</Typography.Title>
            </div>
          </SACard>
        ))}
      </div>
      <div className="admin-quality-panel">
        {servicesMissingSkills.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            message="Services needing AI setup"
            description={servicesMissingSkills
              .map((service) => service.name)
              .join(', ')}
          />
        ) : null}
        {barbersMissingSkills.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            message="Barbers missing capabilities"
            description={barbersMissingSkills
              .map((barber) => barber.displayName)
              .join(', ')}
          />
        ) : null}
        {!hasSetupGaps ? (
          <Alert
            type="success"
            showIcon
            message="AI-critical service and barber metadata is complete."
          />
        ) : null}
      </div>
    </Space>
  );
}
