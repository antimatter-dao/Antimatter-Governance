import { ChainId, TokenAmount } from '@uniswap/sdk'
import React from 'react'
import { Check, ChevronDown } from 'react-feather'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
// import { useTranslation } from 'react-i18next'
import { darken } from 'polished'
import { CountUp } from 'use-count-up'
import { useActiveWeb3React } from '../../hooks'
import { useAggregateUniBalance } from '../../state/wallet/hooks'
import { ExternalLink, TYPE } from '../../theme'
import { RowFixed, RowBetween } from '../Row'
import Web3Status from '../Web3Status'
import ClaimModal from '../claim/ClaimModal'
import usePrevious from '../../hooks/usePrevious'
import { ReactComponent as Logo } from '../../assets/svg/antimatter_logo.svg'
import { ReactComponent as ETH } from '../../assets/svg/eth_logo.svg'
// import { ReactComponent as HECOInvert } from '../../assets/svg/huobi_inverted.svg'
// import { ReactComponent as HECO } from '../../assets/svg/huobi.svg'
import useTheme from 'hooks/useTheme'
import ToggleMenu from './ToggleMenu'

interface TabContent {
  title: string
  route?: string
  link?: string
  titleContent?: JSX.Element
}

interface Tab extends TabContent {
  subTab?: TabContent[]
}

export const tabs: Tab[] = [
  { title: 'Option Trading', route: 'option_trading' },
  { title: 'Option Exercise', route: 'option_exercise' },
  { title: 'Option Creation', route: 'option_creation' },
  { title: 'Farm', route: 'farm' },
  { title: 'Governance', route: 'governance' },
  {
    title: 'About',
    subTab: [
      { title: 'Docs', link: 'https://docs.antimatter.finance/' },
      { title: 'Github', link: 'https://github.com/antimatter-finance' },
      {
        title: 'Auditing Report',
        link: 'https://github.com/antimatter-finance/antimatter-finance.github.io/blob/main/audit_en.pdf'
      },
      {
        title: 'faq',
        titleContent: <FAQButton />,
        route: 'faq'
      }
    ]
  }
]

const NetworkInfo: {
  [key: number]: { title: string; color: string; icon: JSX.Element; link?: string; linkIcon?: JSX.Element }
} = {
  1: {
    color: '#FFFFFF',
    icon: <ETH />,
    // link: 'https://app.antimatter.finance',
    title: 'ETH'
  },
  [ChainId.ROPSTEN]: {
    color: '#FFFFFF',
    icon: <ETH />,
    title: 'Ropsten'
  },
  [ChainId.RINKEBY]: {
    color: '#FFFFFF',
    icon: <ETH />,
    title: 'Rinkeby'
  }
  // 128: {
  //   color: '#059BDC',
  //   icon: <HECOInvert />,
  //   linkIcon: <HECO />,
  //   link: 'https://heco.antimatter.finance',
  //   title: 'HECO'
  // }
  // 56: {
  //   color: '#F0B90B',
  //   icon: <BSCInvert />,
  //   linkIcon: <BSC />,
  //  title:'BSC'
  // }
}

export const headerHeightDisplacement = '32px'

const HeaderFrame = styled.div`
  display: flex;
  justify-content: flex-start;
  flex-direction: row;
  width: 100%;
  top: 0;
  height: ${({ theme }) => theme.headerHeight}
  position: relative;
  border-bottom: 1px solid ${({ theme }) => theme.text5};
  padding: 27px 0 0;
  z-index: 5;
  background-color:${({ theme }) => theme.bg1}
  ${({ theme }) => theme.mediaWidth.upToLarge`
    grid-template-columns: 1fr;
    padding: 0 1rem;
    width: 100%;
    position: relative;
  `};

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 0.5rem 1rem;
  `}
`

const HeaderControls = styled.div`
  display: flex;
  flex-direction: row;
  justify-self: flex-end;
  align-items: center;
  ${({ theme }) => theme.mediaWidth.upToLarge`
    height: ${theme.headerHeight};
    flex-direction: row;
    align-items: center;
    justify-self: center;
    padding: 1rem;
    position: fixed;
    bottom: 0px;
    left: 0px;
    width: 100%;
    z-index: 99;
    background-color: ${theme.bg2};
    justify-content: center;
    border-top: 1px solid;
    border-top-color: #303030;
  `};
`

const HeaderElement = styled.div<{
  show?: boolean
}>`
  display: flex;

  /* addresses safari's lack of support for "gap" */
  & > *:not(:first-child) {
    margin-left: 8px;
  }

  ${({ theme }) => theme.mediaWidth.upToLarge`
    align-items: center;
  `};
  & > div {
    border: 1px solid ${({ theme, show }) => (show ? theme.text1 : 'transparent')};
    border-radius: 4px;
    height: 32px;
    display: flex;
    align-items: center;
    font-size: 13px;
  }
`

const HeaderRow = styled(RowFixed)`
  width: 100%;
  min-width: 1100px;
  padding-left: 2rem;
  align-items: flex-start
    ${({ theme }) => theme.mediaWidth.upToLarge`
    background: red
   align-items: center
  `};
`

const AccountElement = styled.div<{ active: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: transparent;
  border-radius: 4px;
  white-space: nowrap;
  cursor: pointer;
  padding: ${({ active }) => (active ? '7px 12px' : 'unset')};
  border: 1px solid ${({ theme, active }) => (active ? theme.text1 : 'transparent')};
`

const UNIAmount = styled.div`
  color: white;
  font-size: 13px;
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: transparent;
  &:after {
    content: '';
    border-right: 1px solid ${({ theme }) => theme.text1};
    margin: 0 16px;
    height: 16px;
  }
`

const UNIWrapper = styled.span`
  width: fit-content;
  position: relative;
`

// const HideSmall = styled.span`
//   ${({ theme }) => theme.mediaWidth.upToSmall`
//     display: none;
//   `};
// `

const NetworkCard = styled.div<{ color?: string }>`
  color: #000000;
  cursor: pointer;
  display: flex;
  padding: 0 4px;
  height: 32px;
  margin-right: 12px;
  margin-left: 19px;
  justify-content: center;
  border-radius: 4px;
  align-items: center;
  background-color: ${({ color }) => color ?? 'rgba(255, 255, 255, 0.12)'}
  font-size: 13px;
  font-weight: 500;
  position: relative;
  & > svg:first-child {
    height: 20px;
    width: 20px;
  }
  .dropdown_wrapper {
    &>div{
      a {
        padding: 12px 12px 12px 44px ;
      }
    }
  }

  :hover {
    cursor: pointer;
    .dropdown_wrapper {
      top: 100%;
      left: -20px;
      height: 10px;
      position: absolute;
      width: 172px;
      &>div{
        height: auto;
        margin-top: 10px;
        border: 1px solid ${({ theme }) => theme.text5};
        a{
        position: relative;
          & >svg{
            height: 20px;
            width: 20px;
            margin-right: 15px;
          }
        }
      }
    }
  }
  ${({ theme }) => theme.mediaWidth.upToSmall`
    margin: 0
`};

`

const Dropdown = styled.div`
  z-index: 3;
  height: 0;
  position: absolute;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 172px;
  a {
    color: #ffffff;
    background-color: ${({ theme }) => theme.bg2};
    text-decoration: none;
    padding: 14px 17px;
    border-bottom: 1px solid ${({ theme }) => theme.text5}
    transition: 0.5s;
    display: flex;
    align-items: center;
    :last-child{
      border: none;
    }
    :hover {
      background-color: ${({ theme }) => theme.bg4};
      color: ${({ theme }) => darken(0.1, theme.primary1)};
    }
  }
`

export const StyledMenuButton = styled.button`
  position: relative;
  width: 100%;
  height: 100%;
  border: none;
  background-color: transparent;
  margin: 0;
  padding: 0;
  height: 35px;
  background-color: ${({ theme }) => theme.bg3};
  margin-left: 8px;
  padding: 0.15rem 0.5rem;
  border-radius: 0.5rem;

  :hover,
  :focus {
    cursor: pointer;
    outline: none;
    background-color: ${({ theme }) => theme.bg4};
  }

  svg {
    margin-top: 2px;
  }
  > * {
    stroke: ${({ theme }) => theme.text1};
  }
`

const StyledLogo = styled(Logo)`
  margin-right: 60px;
`

function FAQButton() {
  const theme = useTheme()
  return (
    <RowFixed>
      <RowFixed
        justify="center"
        style={{
          borderRadius: '50%',
          border: `1px solid ${theme.primary1}`,
          width: '18px',
          height: '18px',
          marginRight: '12px'
        }}
      >
        <TYPE.body fontSize={14} color={theme.primary1}>
          ?
        </TYPE.body>
      </RowFixed>
      FAQ
    </RowFixed>
  )
}

const MobileHeader = styled.header`
  width:100%;
  display:flex;
  justify-content:space-between;
  align-items: center;
  padding: 0 24px;
  position:relative;
  background-color: ${({ theme }) => theme.bg1}
  height:${({ theme }) => theme.mobileHeaderHeight}
  position:fixed;
  top: 0;
  left: 0;
  z-index: 100;
  display: none;
  ${({ theme }) => theme.mediaWidth.upToLarge`
    display: inherit
`};
`

export default function Header() {
  const { account, chainId } = useActiveWeb3React()

  const aggregateBalance: TokenAmount | undefined = useAggregateUniBalance()

  const countUpValue = aggregateBalance?.toFixed(0) ?? '0'
  const countUpValuePrevious = usePrevious(countUpValue) ?? '0'

  return (
    <HeaderFrame>
      <ClaimModal />
      <HeaderRow>
        <Link to={'/'}>
          <StyledLogo />
        </Link>
        <div style={{ paddingLeft: 8, display: 'flex', alignItems: 'center', marginLeft: 'auto', marginRight: '2rem' }}>
          <HeaderControls>
            <HeaderElement show={!!account}>
              {/* <HideSmall> */}
              {chainId && NetworkInfo[chainId] && (
                <NetworkCard title={NetworkInfo[chainId].title} color={NetworkInfo[chainId as number]?.color}>
                  {NetworkInfo[chainId as number]?.icon} {NetworkInfo[chainId].title}
                  <ChevronDown size={18} style={{ marginLeft: '5px' }} />
                  <div className="dropdown_wrapper">
                    <Dropdown>
                      {Object.keys(NetworkInfo).map(key => {
                        const info = NetworkInfo[parseInt(key) as keyof typeof NetworkInfo]
                        if (!info) {
                          return null
                        }
                        return info.link ? (
                          <ExternalLink href={info.link} key={info.link}>
                            {parseInt(key) === chainId && (
                              <span style={{ position: 'absolute', left: '15px' }}>
                                <Check size={18} />
                              </span>
                            )}
                            {info.linkIcon ?? info.icon}
                            {info.title}
                          </ExternalLink>
                        ) : null
                      })}
                    </Dropdown>
                  </div>
                </NetworkCard>
              )}
              {/* </HideSmall> */}
            </HeaderElement>
            {/* <HeaderElementWrap>
          <StyledMenuButton onClick={() => toggleDarkMode()}>
            {darkMode ? <Moon size={20} /> : <Sun size={20} />}
          </StyledMenuButton>
          <Menu />
        </HeaderElementWrap> */}

            <AccountElement active={!!account} style={{ pointerEvents: 'auto' }}>
              {!!account && aggregateBalance && (
                <UNIWrapper>
                  <UNIAmount style={{ pointerEvents: 'none' }}>
                    {account && (
                      // <HideSmall>
                      <TYPE.white
                        style={{
                          paddingRight: '.4rem'
                        }}
                      >
                        <CountUp
                          key={countUpValue}
                          isCounting
                          start={parseFloat(countUpValuePrevious)}
                          end={parseFloat(countUpValue)}
                          thousandsSeparator={','}
                          duration={1}
                        />
                      </TYPE.white>
                      // </HideSmall>
                    )}
                    MATTER
                  </UNIAmount>
                  {/* <CardNoise /> */}
                </UNIWrapper>
              )}
              {/* {account && userEthBalance ? (
                <BalanceText style={{ flexShrink: 0 }} fontWeight={500}>
                  {userEthBalance?.toSignificant(4)} ETH
                </BalanceText>
              ) : null} */}
              <Web3Status />
            </AccountElement>
          </HeaderControls>
        </div>
      </HeaderRow>
      <MobileHeader>
        <RowBetween>
          <Link to={'/'}>
            <StyledLogo />
          </Link>
          <ToggleMenu />
        </RowBetween>
      </MobileHeader>
    </HeaderFrame>
  )
}
