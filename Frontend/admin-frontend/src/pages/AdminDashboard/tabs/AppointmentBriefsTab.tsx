import { Alert, Empty, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type { AppointmentBriefRecord, PagingMeta } from '../../../lib/api';
import type { TablePage } from '../types';

type AppointmentBriefsTabProps = {
  columns: ColumnsType<AppointmentBriefRecord>;
  data: AppointmentBriefRecord[];
  loading: boolean;
  pagingMeta: PagingMeta | null;
  page: TablePage;
  onPageChange: (page: TablePage) => void;
};

export function AppointmentBriefsTab({
  columns,
  data,
  loading,
  pagingMeta,
  page,
  onPageChange,
}: AppointmentBriefsTabProps) {
  return (
    <div className="admin-table-section">
      <Alert
        type="info"
        showIcon
        className="admin-section-guide"
        message="Appointment prep queue"
        description="Briefs are generated from the client consultation at booking time. Open a brief to review the customer's request, hair state, desired look, and safety notes before the appointment."
      />
      <div className="admin-section-toolbar">
        <Typography.Title level={4}>
          Upcoming appointment briefs
        </Typography.Title>
      </div>
      {data.length === 0 && !loading ? (
        <Empty description="No briefs generated yet" />
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 980 }}
          pagination={{
            current: pagingMeta?.page ?? page.page,
            pageSize: pagingMeta?.limit ?? page.limit,
            total: pagingMeta?.totalItem ?? 0,
            showSizeChanger: false,
            onChange: (nextPage, limit) =>
              onPageChange({ page: nextPage, limit }),
          }}
        />
      )}
    </div>
  );
}
