import { Alert, Button, Empty, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';

import { SACard } from '../../../components/common';
import type {
  PagingMeta,
  ReferenceDataItemRecord,
  ReferenceDataType,
} from '../../../lib/api';
import type { TablePage } from '../types';

type ReferenceDataTabProps = {
  columns: ColumnsType<ReferenceDataItemRecord>;
  barberCapabilityItems: ReferenceDataItemRecord[];
  safetyTriggerItems: ReferenceDataItemRecord[];
  barberCapabilityLoading: boolean;
  safetyTriggerLoading: boolean;
  barberCapabilityPagingMeta: PagingMeta | null;
  safetyTriggerPagingMeta: PagingMeta | null;
  barberCapabilityPage: TablePage;
  safetyTriggerPage: TablePage;
  onBarberCapabilityPageChange: (page: TablePage) => void;
  onSafetyTriggerPageChange: (page: TablePage) => void;
  onCreate: (type: ReferenceDataType) => void;
};

export function ReferenceDataTab({
  columns,
  barberCapabilityItems,
  safetyTriggerItems,
  barberCapabilityLoading,
  safetyTriggerLoading,
  barberCapabilityPagingMeta,
  safetyTriggerPagingMeta,
  barberCapabilityPage,
  safetyTriggerPage,
  onBarberCapabilityPageChange,
  onSafetyTriggerPageChange,
  onCreate,
}: ReferenceDataTabProps) {
  return (
    <Space direction="vertical" size={20} className="admin-full-width">
      <Alert
        type="info"
        showIcon
        className="admin-section-guide"
        message="Why reference data matters"
        description="Capabilities and safety triggers are the canonical vocabulary for AI matching. Admins should maintain these here so barber profiles and services both use the same controlled terms."
      />
      <div className="admin-reference-grid">
        <SACard bodyPadding={24}>
          <div className="admin-section-toolbar">
            <div>
              <Typography.Title level={4}>Barber capabilities</Typography.Title>
              <Typography.Text type="secondary">
                Used by barber profiles and service matching rules.
              </Typography.Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => onCreate('barber_capability')}
            >
              Add capability
            </Button>
          </div>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={barberCapabilityItems}
            loading={barberCapabilityLoading}
            pagination={{
              current:
                barberCapabilityPagingMeta?.page ?? barberCapabilityPage.page,
              pageSize:
                barberCapabilityPagingMeta?.limit ??
                barberCapabilityPage.limit,
              total: barberCapabilityPagingMeta?.totalItem ?? 0,
              showSizeChanger: false,
              onChange: (page, limit) =>
                onBarberCapabilityPageChange({ page, limit }),
            }}
            locale={{
              emptyText: (
                <Empty description="No barber capabilities added yet." />
              ),
            }}
          />
        </SACard>
        <SACard bodyPadding={24}>
          <div className="admin-section-toolbar">
            <div>
              <Typography.Title level={4}>Safety triggers</Typography.Title>
              <Typography.Text type="secondary">
                Used by service AI config before safety rules are checked.
              </Typography.Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => onCreate('safety_trigger')}
            >
              Add trigger
            </Button>
          </div>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={safetyTriggerItems}
            loading={safetyTriggerLoading}
            pagination={{
              current: safetyTriggerPagingMeta?.page ?? safetyTriggerPage.page,
              pageSize:
                safetyTriggerPagingMeta?.limit ?? safetyTriggerPage.limit,
              total: safetyTriggerPagingMeta?.totalItem ?? 0,
              showSizeChanger: false,
              onChange: (page, limit) =>
                onSafetyTriggerPageChange({ page, limit }),
            }}
            locale={{
              emptyText: <Empty description="No safety triggers added yet." />,
            }}
          />
        </SACard>
      </div>
    </Space>
  );
}
