import { Alert, Button, Empty, Select, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';

import type { PagingMeta, ServiceAiConfigRecord } from '../../../lib/api';
import type { TablePage } from '../types';

type ServiceAiConfigTabProps = {
  columns: ColumnsType<ServiceAiConfigRecord>;
  data: ServiceAiConfigRecord[];
  loading: boolean;
  pagingMeta: PagingMeta | null;
  page: TablePage;
  unconfiguredServiceOptions: { label: string; value: string }[];
  onPageChange: (page: TablePage) => void;
  onCreate: () => void;
  onSelectServiceToConfigure: (serviceId: string) => void;
  filterSelectOption: (
    inputValue: string,
    option?: { label?: unknown; value?: unknown },
  ) => boolean;
};

export function ServiceAiConfigTab({
  columns,
  data,
  loading,
  pagingMeta,
  page,
  unconfiguredServiceOptions,
  onPageChange,
  onCreate,
  onSelectServiceToConfigure,
  filterSelectOption,
}: ServiceAiConfigTabProps) {
  return (
    <div className="admin-table-section">
      <Alert
        type="info"
        showIcon
        className="admin-section-guide"
        message="Why service AI config matters"
        description="Required skills tell the AI who can perform a service. Safety triggers are keywords or situations that should make the AI check safety rules before recommending a path."
      />
      <div className="admin-section-toolbar">
        <div>
          <Typography.Title level={4}>Service matching rules</Typography.Title>
          <Typography.Text type="secondary">
            Every booking service should have capabilities, complexity, and
            optional safety triggers before the consultation agent uses it.
          </Typography.Text>
        </div>
        <Space wrap>
          <Select
            className="admin-toolbar-select"
            placeholder="Jump to a service that needs setup"
            options={unconfiguredServiceOptions}
            onSelect={onSelectServiceToConfigure}
            showSearch
            filterOption={filterSelectOption}
            optionFilterProp="label"
            disabled={loading || unconfiguredServiceOptions.length === 0}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            Add service
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1040 }}
        pagination={{
          current: pagingMeta?.page ?? page.page,
          pageSize: pagingMeta?.limit ?? page.limit,
          total: pagingMeta?.totalItem ?? 0,
          showSizeChanger: false,
          onChange: (nextPage, limit) => onPageChange({ page: nextPage, limit }),
        }}
        locale={{
          emptyText: <Empty description="No booking services available yet." />,
        }}
      />
    </div>
  );
}
