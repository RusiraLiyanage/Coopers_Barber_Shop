import { Typography } from 'antd';
import styled from 'styled-components';

type SAModalHeaderProps = {
  title: string;
  subtitle?: string;
  level?: 2 | 3 | 4 | 5;
  centered?: boolean;
  className?: string;
};

const HeaderWrapper = styled.div<{ $centered: boolean }>`
  text-align: ${({ $centered }) => ($centered ? 'center' : 'left')};
`;

const HeaderTitle = styled(Typography.Title)`
  margin: 0 0 4px !important;
`;

export default function SAModalHeader({
  title,
  subtitle,
  level = 3,
  centered = false,
  className,
}: SAModalHeaderProps) {
  return (
    <HeaderWrapper className={className} $centered={centered}>
      <HeaderTitle level={level}>{title}</HeaderTitle>
      {subtitle ? (
        <Typography.Text type="secondary">{subtitle}</Typography.Text>
      ) : null}
    </HeaderWrapper>
  );
}
