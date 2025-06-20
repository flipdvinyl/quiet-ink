import React from 'react';
import styled from '@emotion/styled';
import { useTheme } from '@emotion/react';

const AnimationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 80px;
  height: 80px;
`;

const Book = styled.div`
  width: 100%;
  border-bottom: ${({ theme }) => `${theme.text}66 solid 2px`};
  border-top: ${({ theme }) => `${theme.text} solid 4px`};
  position: relative;

  &::before {
    position: absolute;
    content: '';
    width: 50%;
    left: 0;
    bottom: 1px;
    border-bottom: ${({ theme }) => `${theme.text}66 solid 2px`};
    transform: rotate(45deg);
    transform-origin: right center;
    animation: loading 1s ease-in-out infinite;
  }

  &::after {
    position: absolute;
    content: '';
    width: 50%;
    left: 0;
    bottom: 1px;
    border-bottom: ${({ theme }) => `${theme.text}66 solid 2px`};
    transform: rotate(145deg);
    transform-origin: right center;
    animation: loading 1.2s ease-in-out infinite;
  }

  @keyframes loading {
    from {
      transform: rotate(180deg);
    }
    to {
      transform: rotate(0deg);
    }
  }
`;

const BookFlipAnimation: React.FC = () => {
  const theme = useTheme();
  
  return (
    <AnimationContainer>
      <Book theme={theme} />
    </AnimationContainer>
  );
};

export default BookFlipAnimation; 