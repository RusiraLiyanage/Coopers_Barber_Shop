import { Alert, Empty, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type { HairHistoryRecord, PagingMeta } from '../../../lib/api';
import type { TablePage } from '../types';

type HairHistoryTabProps = {
  columns: ColumnsType<HairHistoryRecord>;
  data: HairHistoryRecord[];
  loading: boolean;
  pagingMeta: PagingMeta | null;
  page: TablePage;
  onPageChange: (page: TablePage) => void;
};

export function HairHistoryTab({
  columns,
  data,
  loading,
  pagingMeta,
  page,
  onPageChange,
}: HairHistoryTabProps) {
  return (
    <div className="admin-table-section">
      <Alert
        type="info"
        showIcon
        className="admin-section-guide"
        message="Why hair history matters"
        description="Hair history is cross-visit memory. It helps the AI avoid repeating unsafe recommendations when a client has previous colour, bleach, product, sensitivity, or damage history."
      />
      <div className="admin-section-toolbar">
        <Typography.Title level={4}>Client hair history</Typography.Title>
      </div>
      {data.length === 0 && !loading ? (
        <Empty description="No hair history recorded yet" />
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1100 }}
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
