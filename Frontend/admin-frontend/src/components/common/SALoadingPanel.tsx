import { Spin, type SpinProps } from 'antd';
import styled from 'styled-components';

type SALoadingPanelProps = {
  size?: SpinProps['size'];
  className?: string;
};

const LoadingPanel = styled.div`
  display: flex;
  justify-content: center;
  padding: 48px;
`;

export default function SALoadingPanel({
  size = 'large',
  className,
}: SALoadingPanelProps) {
  return (
    <LoadingPanel className={className}>
      <Spin size={size} />
    </LoadingPanel>
  );
}
