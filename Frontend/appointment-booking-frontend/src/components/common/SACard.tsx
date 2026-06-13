import { Card, type CardProps } from 'antd';
import styled from 'styled-components';

type SACardProps = CardProps & {
  radius?: number | string;
  bodyPadding?: number | string;
  shadow?: boolean;
};

function toCssSize(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value;
}

const StyledCard = styled(Card)<{
  $radius: string;
  $bodyPadding: string;
  $shadow: boolean;
}>`
  width: 100%;
  border-radius: ${({ $radius }) => $radius};
  ${({ $shadow }) =>
    $shadow ? 'box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);' : ''}

  .ant-card-body {
    padding: ${({ $bodyPadding }) => $bodyPadding};
  }
`;

export default function SACard({
  radius = 8,
  bodyPadding = 24,
  shadow = false,
  children,
  ...props
}: SACardProps) {
  return (
    <StyledCard
      {...props}
      $radius={toCssSize(radius)}
      $bodyPadding={toCssSize(bodyPadding)}
      $shadow={shadow}
    >
      {children}
    </StyledCard>
  );
}
