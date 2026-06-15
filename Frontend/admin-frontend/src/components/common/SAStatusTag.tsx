import { Tag, type TagProps } from 'antd';
import styled from 'styled-components';

type SAStatusTagSize = 'default' | 'large';

type SAStatusTagProps = TagProps & {
  size?: SAStatusTagSize;
};

const StyledTag = styled(Tag)<{ $size: SAStatusTagSize }>`
  align-self: flex-start;
  font-weight: 700;

  ${({ $size }) =>
    $size === 'large'
      ? `
        padding: 4px 10px;
        font-size: 14px;
      `
      : `
        padding: 2px 8px;
        font-size: 12px;
      `}
`;

export default function SAStatusTag({
  size = 'default',
  children,
  ...props
}: SAStatusTagProps) {
  return (
    <StyledTag {...props} $size={size}>
      {children}
    </StyledTag>
  );
}
