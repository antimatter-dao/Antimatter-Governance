import React from 'react'
import styled, { css } from 'styled-components'
import { ReactComponent as CrossCircleIcon } from '../../assets/svg/cross_circle.svg'
import { ReactComponent as CheckCircleIcon } from '../../assets/svg/check_circle.svg'

export const Wrapper = styled.div<{ clickable: boolean; color?: string; size?: string }>`
  ${({ clickable }) =>
    clickable
      ? css`
          :hover {
            cursor: pointer;
            opacity: 0.8;
          }
        `
      : null}
  > * {
    fill: ${({ theme, color }) => color ?? theme.text2};
  }
  > svg {
    height: ${({ size }) => size ?? '20px'};
  }
`

function IconWrapper({
  size,
  onClick,
  children,
  color
}: {
  children: React.ReactNode
  size?: string
  onClick?: () => void
  color?: string
}) {
  return (
    <Wrapper onClick={onClick} clickable={!!onClick} color={color} size={size}>
      {children}
    </Wrapper>
  )
}

export function CrossCircle({ size, onClick, color }: { size?: string; onClick?: () => void; color?: string }) {
  return (
    <IconWrapper size={size} onClick={onClick} color={color}>
      <CrossCircleIcon />
    </IconWrapper>
  )
}

export function CheckCircle({ size, onClick, color }: { size?: string; onClick?: () => void; color?: string }) {
  return (
    <IconWrapper size={size} onClick={onClick} color={color}>
      <CheckCircleIcon />
    </IconWrapper>
  )
}
