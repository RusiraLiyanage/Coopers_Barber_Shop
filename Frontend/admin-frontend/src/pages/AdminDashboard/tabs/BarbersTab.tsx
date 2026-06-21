import { Alert, Button, Empty, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';

import type { BarberRecord, PagingMeta } from '../../../lib/api';
import type { TablePage } from '../types';

type BarbersTabProps = {
  columns: ColumnsType<BarberRecord>;
  data: BarberRecord[];
  loading: boolean;
  pagingMeta: PagingMeta | null;
  page: TablePage;
  onPageChange: (page: TablePage) => void;
  onCreate: () => void;
};

export function BarbersTab({
  columns,
  data,
  loading,
  pagingMeta,
  page,
  onPageChange,
  onCreate,
}: BarbersTabProps) {
  return (
    <div className="admin-table-section">
      <Alert
        type="info"
        showIcon
        className="admin-section-guide"
        message="Why barber profiles matter"
        description="The AI consultation will use each barber's capabilities, role, availability, and rating to recommend the right person for a client request. Add only barbers that should participate in AI matching."
      />
      <div className="admin-section-toolbar">
        <Typography.Title level={4}>Barber profiles</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          Add barber
        </Button>
      </div>
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
          onChange: (nextPage, limit) => onPageChange({ page: nextPage, limit }),
        }}
        locale={{
          emptyText: (
            <Empty description="No AI-ready barbers yet. Add barber profiles manually to start matching clients." />
          ),
        }}
      />
    </div>
  );
}
