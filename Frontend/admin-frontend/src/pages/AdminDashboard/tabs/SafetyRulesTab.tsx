import { Alert, Button, Empty, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';

import type { PagingMeta, SafetyRuleRecord } from '../../../lib/api';
import type { TablePage } from '../types';

type SafetyRulesTabProps = {
  columns: ColumnsType<SafetyRuleRecord>;
  data: SafetyRuleRecord[];
  loading: boolean;
  pagingMeta: PagingMeta | null;
  page: TablePage;
  onPageChange: (page: TablePage) => void;
  onCreate: () => void;
};

export function SafetyRulesTab({
  columns,
  data,
  loading,
  pagingMeta,
  page,
  onPageChange,
  onCreate,
}: SafetyRulesTabProps) {
  return (
    <div className="admin-table-section">
      <Alert
        type="info"
        showIcon
        className="admin-section-guide"
        message="Why safety rules matter"
        description="Safety rules are the policy layer for risky requests such as scalp sensitivity, allergies, bleach damage, box dye, or formal styling requirements. The AI should use them before creating a recommendation."
      />
      <div className="admin-section-toolbar">
        <Typography.Title level={4}>Safety rules</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          Add rule
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 900 }}
        pagination={{
          current: pagingMeta?.page ?? page.page,
          pageSize: pagingMeta?.limit ?? page.limit,
          total: pagingMeta?.totalItem ?? 0,
          showSizeChanger: false,
          onChange: (nextPage, limit) => onPageChange({ page: nextPage, limit }),
        }}
        locale={{
          emptyText: (
            <Empty description="No safety rules yet. Add rules after configuring the services they apply to." />
          ),
        }}
      />
    </div>
  );
}
