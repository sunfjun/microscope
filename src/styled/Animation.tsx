import * as React from 'react'
import styled, { StyledFunction } from './styledComponents'
import theme from '../config/theme'

interface IFaceInDiv {
  fadeIn: boolean
}
const FadeInDivCons: StyledFunction<
  IFaceInDiv & React.HTMLProps<HTMLDivElement>
  > =
  styled.div

export const FadeInDiv = FadeInDivCons`
  transform: ${props => `translateY(${props.fadeIn ? '0' : '100vh'})`};
  transition: transform 3s;
`

export const remainding = false
