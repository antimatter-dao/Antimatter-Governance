import React, { useCallback, useState } from 'react'
import { CurrencyAmount } from '@uniswap/sdk'
import { useHistory } from 'react-router-dom'
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core'
// import { XCircle } from 'react-feather'
import styled from 'styled-components'
import { RowBetween, RowFixed } from 'components/Row'
import { AutoColumn } from 'components/Column'
import { TYPE } from 'theme'
import { ButtonOutlined } from 'components/Button'
import AppBody from 'pages/AppBody'
import GovernanceProposalCreation from './GovernanceProposalCreation'
import { GovernanceData, StatusOption, useGovernanceList } from '../../hooks/useGovernanceDetail'
// import Loader from 'assets/svg/antimatter_background_logo.svg'
import { Timer } from 'components/Timer/intex'
import useTheme from 'hooks/useTheme'
import { GOVERNANCE_TOKEN } from '../../constants'
import { useCurrencyBalance } from 'state/wallet/hooks'
import { isAddress, shortenAddress } from 'utils'
import { ellipsis } from 'polished'

const Wrapper = styled.div`
  width: 100%;
  margin-bottom: auto;
  max-width: 1280px;
`
// const VerticalDivider = styled.div`
//   width: 1px;
//   height: 36px;
//   border-right: 1px solid ${({ theme }) => theme.bg4};
//   margin: 0 24px;
// `

// const DividerThin = styled.div`
//   width: calc(100% + 48px);
//   margin: 0 -24px;
//   height: 1px;
//   border-bottom: 1px solid rgba(255,255,255,.2)};
// `

const EmptyProposals = styled.div`
  background: ${({ theme }) => theme.bg1};
  padding: 16px 12px;
  border-radius: 12px;
  display: flex;
  max-width: 100%;
  padding: 24px;
  margin: auto;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`

export const ContentWrapper = styled.div`
  position: relative;
  max-width: 1280px;
  margin: auto;
  display: grid;
  grid-gap: 24px;
  grid-template-columns: repeat(auto-fill, 340px);
  padding: 52px 0;
  justify-content: center;
  ${({ theme }) => theme.mediaWidth.upToLarge`padding: 30px`}
  ${({ theme }) => theme.mediaWidth.upToSmall`
  padding: 0 24px 0 82px
  `}
`
export const Live = styled.div<{ color?: string }>`
  color: ${({ theme, color }) => color || theme.primary1};
  display: flex;
  align-items: center;
  font-size: 12px;
  :before {
    content: ${({ color }) => (color === '' ? `"''"` : undefined)};
    height: 9px;
    width: 9px;
    background-color: ${({ theme, color }) => color || theme.primary1};
    border-radius: 50%;
    margin-right: 8px;
  }
`
export const ProgressBar = styled.div<{ leftPercentage: string; isLarge?: boolean }>`
  width: 100%;
  height: ${({ isLarge }) => (isLarge ? '12px' : '8px')};
  border-radius: 14px;
  background-color: #25252510;
  position: relative;
  
  :before {
    position: absolute
    top:0;
    left: 0;
    content: '';
    height: 100%;
    border-radius: 14px;
    width: ${({ leftPercentage }) => leftPercentage};
    background-color: ${({ theme }) => theme.primary1};
  }
`
const Synopsis = styled.div`
  width: 100%;
  height: 54px;
  font-size: 14px;
  overflow: hidden;
  margin-top: 4px;
  color: #25252550;
`

const MobileCreate = styled.div`
  display: none;
  position: fixed;
  left: 0;
  bottom: ${({ theme }) => theme.headerHeight};
  height: 72px;
  width: 100%;
  background-color: ${({ theme }) => theme.bg2};
  align-items: center;
  padding: 0 24px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
display: flex
`};
`

export default function Governance() {
  const { account, error } = useWeb3React()
  const theme = useTheme()
  const { list: governanceList } = useGovernanceList()
  const [isCreationOpen, setIsCreationOpen] = useState(false)
  const history = useHistory()
  const balance = useCurrencyBalance(account ?? undefined, GOVERNANCE_TOKEN)
  const handleCardClick = useCallback(id => () => history.push('governance/detail/' + id), [history])

  const handleOpenCreation = useCallback(() => {
    setIsCreationOpen(true)
  }, [])
  const handleCloseCreation = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsCreationOpen(false)
  }, [])

  return (
    <>
      <GovernanceProposalCreation isOpen={isCreationOpen} onDismiss={handleCloseCreation} />
      <Wrapper id="governance">
        <RowFixed marginBottom={46} marginTop={40}>
          <AutoColumn>
            <TYPE.main fontSize={32} fontWeight={700}>
              Governance
            </TYPE.main>
          </AutoColumn>
        </RowFixed>
        <div style={{ backgroundColor: theme.bg1, padding: '38px 24px', borderRadius: 20, marginBottom: 24 }}>
          <AutoColumn>
            <RowBetween marginBottom={32}>
              <TYPE.main fontSize={24} fontWeight={700}>
                Voting
              </TYPE.main>
              <ButtonOutlined
                disabled={error instanceof UnsupportedChainIdError}
                onClick={handleOpenCreation}
                width="180px"
                style={{ color: '#31B047', borderColor: '#31B047', height: 36 }}
              >
                + Create Proposal
              </ButtonOutlined>
            </RowBetween>

            <RowBetween>
              <div style={{ display: 'flex', width: '100%', gap: 20 }}>
                <div
                  style={{
                    backgroundColor: theme.bg3,
                    padding: '20px 24px',
                    borderRadius: 20,
                    width: '100%'
                  }}
                >
                  <RowFixed>
                    <TYPE.smallGray fontSize={14} style={{ marginRight: '12px' }}>
                      Your Voting Power:
                    </TYPE.smallGray>

                    <TYPE.smallHeader fontSize={20} fontWeight={500}>
                      {balance?.toSignificant()} Votes
                    </TYPE.smallHeader>
                  </RowFixed>
                </div>
                <div
                  style={{
                    backgroundColor: theme.bg3,
                    padding: '20px 24px',
                    borderRadius: 20,
                    width: '100%'
                  }}
                >
                  <RowFixed>
                    <TYPE.smallGray fontSize={14} style={{ marginRight: '12px' }}>
                      Your Voting Power:
                    </TYPE.smallGray>

                    <TYPE.smallHeader fontSize={20} fontWeight={500}>
                      {balance?.toSignificant()} Votes
                    </TYPE.smallHeader>
                  </RowFixed>
                </div>
              </div>
            </RowBetween>
          </AutoColumn>
        </div>
        {governanceList?.length === 0 && (
          <EmptyProposals>
            <TYPE.body style={{ marginBottom: '8px' }}>No proposals found.</TYPE.body>
            <TYPE.subHeader>
              <i>Proposals submitted by community members will appear here.</i>
            </TYPE.subHeader>
          </EmptyProposals>
        )}
        <ContentWrapper>
          {governanceList &&
            governanceList.map(data => <GovernanceCard data={data} key={data.id} onClick={handleCardClick(data.id)} />)}
          <GovernanceCard
            data={{
              id: '1',
              title: '11111',
              creator: '11111sdfhjhsdglsfhglk',
              contents: { summary: '111', details: '111', agreeFor: '111', againstFor: '111' },
              timeLeft: '10101010',
              voteFor: '1000000000000000000',
              voteAgainst: '2000000000000000000',
              totalVotes: '3000000000000000000',
              status: StatusOption.Live
            }}
            key={'1'}
            onClick={handleCardClick('1')}
          />
        </ContentWrapper>
        {/* <AlternativeDisplay count={governanceList ? governanceList.length : undefined} loading={loading} /> */}
      </Wrapper>
      <MobileCreate>
        <ButtonOutlined onClick={handleOpenCreation} style={{ color: '#31B047', borderColor: '#31B047', height: 36 }}>
          + Create Proposal
        </ButtonOutlined>
      </MobileCreate>
    </>
  )
}

function GovernanceCard({
  data: { title, id, creator, timeLeft, voteFor, voteAgainst, contents, status },
  onClick
}: {
  data: GovernanceData
  onClick: () => void
}) {
  // const [hover, setHover] = useState(false)
  const theme = useTheme()

  // const handleEnter = () => {
  //   setHover(true)
  // }

  // const handleLeave = () => {
  //   setHover(false)
  // }

  return (
    <AppBody
      maxWidth="340px"
      isCard
      style={{ cursor: 'pointer', background: theme.bg1, boxShadow: 'none', border: 'none' }}
    >
      <AutoColumn gap="16px" onClick={onClick}>
        <RowBetween>
          <Live color={'Success' === status ? '#728AE0' : 'Failed' === status ? '#FF0000' : ''}>
            {'Live' === status ? <Timer timer={+timeLeft} onZero={() => {}} /> : status}
          </Live>
          <TYPE.smallGray>#{id}</TYPE.smallGray>
        </RowBetween>
        <AutoColumn gap="8px">
          <TYPE.mediumHeader fontSize={24} fontWeight={700} style={ellipsis('100%')}>
            {title}
          </TYPE.mediumHeader>
          <div
            style={{
              display: 'flex',
              fontSize: 12,
              background: '#25252510',
              padding: '5px 12px',
              width: 'max-content',
              borderRadius: 30,
              gap: 10
            }}
          >
            <TYPE.smallGray> Proposer</TYPE.smallGray>{' '}
            <TYPE.small>{isAddress(creator) ? shortenAddress(creator) : creator}</TYPE.small>
          </div>
        </AutoColumn>
        <Synopsis>{contents?.summary}</Synopsis>
        <AutoColumn gap="12px" style={{ margin: '10px 0' }}>
          <RowBetween>
            <TYPE.smallGray>Votes For:</TYPE.smallGray>
            <TYPE.smallGray>Votes Against:</TYPE.smallGray>
          </RowBetween>
          <ProgressBar leftPercentage={`${(parseInt(voteFor) * 100) / (parseInt(voteFor) + parseInt(voteAgainst))}%`} />
          <RowBetween>
            <TYPE.small fontSize={12} fontWeight={500} display="flex" style={{ alignItems: 'center' }}>
              <TYPE.main fontSize={16} fontWeight={700}>
                {voteFor ? CurrencyAmount.ether(voteFor).toSignificant(2, { groupSeparator: ',' }) : '--'}
              </TYPE.main>{' '}
              &nbsp;MATTER
            </TYPE.small>
            <TYPE.small fontSize={12} fontWeight={500} display="flex" style={{ alignItems: 'center' }}>
              <TYPE.main fontSize={16} fontWeight={700}>
                {voteFor ? CurrencyAmount.ether(voteAgainst).toSignificant(2, { groupSeparator: ',' }) : '--'}{' '}
              </TYPE.main>
              &nbsp;MATTER
            </TYPE.small>
          </RowBetween>
        </AutoColumn>
        {/* <TYPE.small fontWeight={500} style={{ textAlign: 'center', margin: '-4px 0 -10px' }}>
          {hover ? (
            'show info'
          ) : (
            <>
              Time left : <Timer timer={+timeLeft} onZero={() => {}} />
            </>
          )}
        </TYPE.small> */}
      </AutoColumn>
    </AppBody>
  )
}

// export function AlternativeDisplay({ loading }: { count: number | undefined; loading: boolean }) {
//   return (
//     <AutoColumn justify="center" style={{ marginTop: 100 }}>
//       {!loading && count === 0 && (
//         <AutoColumn justify="center" gap="20px">
//           <XCircle size={40} strokeWidth={1} />
//           <TYPE.body>There is no proposal at the moment</TYPE.body>
//           <TYPE.body>Please try again later or create one yourself</TYPE.body>
//         </AutoColumn>
//       )}
//       {loading && (
//         <AnimatedWrapper>
//           <AnimatedImg>
//             <img src={Loader} alt="loading-icon" />
//           </AnimatedImg>
//         </AnimatedWrapper>
//       )}
//     </AutoColumn>
//   )
// }
