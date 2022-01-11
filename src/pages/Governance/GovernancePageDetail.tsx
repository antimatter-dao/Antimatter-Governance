import React, { useState, useCallback, useMemo } from 'react'
import { ChevronLeft, X } from 'react-feather'
import styled from 'styled-components'
import { Live } from '.'
import { RowBetween } from 'components/Row'
import useTheme from 'hooks/useTheme'
import { ButtonEmpty, ButtonOutlinedPrimary, ButtonPrimary } from 'components/Button'
import { AutoColumn } from 'components/Column'
import { HideSmall, ShowSmall, TYPE } from 'theme'
import { ProgressBar } from './'
import Card from 'components/Card'
import TransactionConfirmationModal from 'components/TransactionConfirmationModal'
import { SubmittedView } from 'components/ModalViews'
import Modal from 'components/Modal'
import { useGovernanceDetails, useUserStaking } from '../../hooks/useGovernanceDetail'
import { CurrencyAmount, JSBI, TokenAmount } from '@uniswap/sdk'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import { GOVERNANCE_ADDRESS, GOVERNANCE_TOKEN, FACTORY_CHAIN_ID } from '../../constants'
import { useCurrencyBalance } from '../../state/wallet/hooks'
import { useWeb3React } from '@web3-react/core'
import { tryParseAmount } from '../../state/swap/hooks'
import { ApprovalState, useApproveCallback } from 'hooks/useApproveCallback'
import { useGovernanceContract } from 'hooks/useContract'
import { useTransactionAdder } from 'state/transactions/hooks'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { RouteComponentProps, useHistory } from 'react-router-dom'
import { getDeltaTime, Timer } from 'components/Timer/intex'
import { Dots } from 'components/swap/styleds'
import { isAddress, shortenAddress } from 'utils'
import CopyHelper from 'components/AccountDetails/Copy'
import { Badge, Box } from '@material-ui/core'

enum VoteOption {
  FOR = 'for',
  AGAINST = 'against'
}
enum ConfirmType {
  Vote = 'Vote',
  Claim = 'Claim'
}
enum StatusOption {
  Live = 'Live',
  Success = 'Success',
  Failed = 'Failed'
}

const Wrapper = styled.div`
  width: 100%;
  max-width: 1160px;
  border:1px solid ${({ theme }) => theme.bg3}
  margin-bottom: auto;
  /* max-width: 1280px; */
  border-radius: 32px;
  padding: 20px 52px;
  margin: 36px 0 50px;
  display: flex;
  flex-direction: column;
  jusitfy-content: cetner;
  align-items: center;
  ${({ theme }) => theme.mediaWidth.upToSmall`
  padding: 0 24px
  `};
  ${({ theme }) => theme.mediaWidth.upToLarge`
  margin-bottom: 70px;
  `};
`

const BackButtonWrapper = styled(RowBetween)`
  width: max-content;
  ${({ theme }) => theme.mediaWidth.upToSmall`
  width:100%`}
`

const VoteOptionCard = styled.div<{ selected?: boolean; disabled?: boolean }>`
  border-radius: 14px;
  border: 1px solid ${({ theme, selected, disabled }) => (selected && !disabled ? theme.primary1 : theme.text4)};
  background-color: ${({ theme }) => theme.translucent};
  width: 160px;
  height: 52px;
  display: flex;
  font-size: 14px;
  color: ${({ theme, selected, disabled }) => (selected && !disabled ? theme.text1 : theme.text3)};
  flex-direction: column;
  align-items: center;
  justify-content: center;
  & > div {
    margin-top: 1px;
  }
  :hover {
    cursor: pointer;
    border: 1px solid ${({ theme, disabled }) => (disabled ? theme.text4 : theme.primary1)};
  }
  ${({ theme }) => theme.mediaWidth.upToSmall`
  width: 100%;
`}
`

const DirectionChangeWrapper = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
  flex-direction: column;
  & > * {
    margin-top: 12px;
  };
  & > *:first-child {
    margin-top: 0;
  }
`}
`

const ModalButtonWrapper = styled(RowBetween)`
  margin-top: 14px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
  flex-direction: column;
  & > *:last-child {
    margin-top: 12px;
  };
  & > *:first-child {
    margin: 0;
  }
`}
`

function toNumber(weiValue: string): string {
  if (weiValue === '') return '-'
  return new TokenAmount(GOVERNANCE_TOKEN, JSBI.BigInt(weiValue)).toSignificant()
}

export default function GovernancePageDetail({
  match: {
    params: { governanceIndex }
  }
}: RouteComponentProps<{ governanceIndex?: string }>) {
  const { account, chainId } = useWeb3React()
  const [selected, setSelected] = useState<VoteOption>(VoteOption.FOR)
  const [showConfirm, setShowConfirm] = useState(false)
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false)
  const [txHash, setTxHash] = useState<string>('')
  const [NeutralSubmitted, setNeutralSubmitted] = useState(false)
  const [voteValue, setVoteValue] = useState('')
  const history = useHistory()
  const { data } = useGovernanceDetails(governanceIndex ?? '')
  const balance = useCurrencyBalance(account ?? undefined, GOVERNANCE_TOKEN)
  const contact = useGovernanceContract()
  const addTransaction = useTransactionAdder()
  const userStaking = useUserStaking(governanceIndex)
  const [submitType, setSubmitType] = useState(ConfirmType.Vote)

  const inputValue = useMemo(() => {
    return tryParseAmount(voteValue, GOVERNANCE_TOKEN)
  }, [voteValue])

  const theme = useTheme()

  const onClaim = useCallback(() => {
    if (!contact || StatusOption.Live === data.status) {
      return
    }
    setAttemptingTxn(true)
    const args = [governanceIndex]
    contact
      .unStaking(...args, {})
      .then((response: TransactionResponse) => {
        setAttemptingTxn(false)
        addTransaction(response, {
          summary: `claim ${toNumber(userStaking.totalStake)} Matter`
        })

        setTxHash(response.hash)
      })
      .catch((error: any) => {
        setAttemptingTxn(false)
      })
  }, [contact, data, governanceIndex, addTransaction, userStaking])

  function calcVoteForPercentage(type: VoteOption, voteFor: string | number, voteAgainst: string | number): string {
    const count = JSBI.add(JSBI.BigInt(voteFor), JSBI.BigInt(voteAgainst))
    if (!JSBI.toNumber(count)) return '0'
    let percentage = JSBI.toNumber(
      JSBI.divide(
        JSBI.multiply(JSBI.BigInt(10000), JSBI.BigInt(type === VoteOption.FOR ? voteFor : voteAgainst)),
        count
      )
    ).toString()
    percentage = (parseFloat(percentage) / 100).toFixed(2)
    return percentage
  }

  const onVote = useCallback(() => {
    if (!contact || !inputValue) {
      return
    }
    const args = [governanceIndex, selected === VoteOption.FOR ? 1 : 2, inputValue?.raw.toString()]

    setAttemptingTxn(true)

    contact
      .vote(...args, {})
      .then((response: TransactionResponse) => {
        setAttemptingTxn(false)
        addTransaction(response, {
          summary: `vote ${selected} ${voteValue} Matter`
        })
        setVoteValue('')

        setTxHash(response.hash)
      })
      .catch((error: any) => {
        setAttemptingTxn(false)
        if (error?.code !== 4001) {
          console.error('---->', error)
        }
      })
  }, [contact, inputValue, governanceIndex, addTransaction, selected, voteValue])

  const handleBackClick = useCallback(() => history.push('/governance'), [history])

  const handleSelect = useCallback(
    (option: VoteOption) => () => {
      setSelected(option)
    },
    []
  )
  const handleSubmit = useCallback(() => {
    setSubmitType(ConfirmType.Vote)
    setShowConfirm(true)
  }, [])

  const handleClaimSubmit = useCallback(() => {
    setSubmitType(ConfirmType.Claim)
    setShowConfirm(true)
  }, [])

  const handleNeutralDismiss = useCallback(() => {
    setNeutralSubmitted(false)
  }, [])

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    setTxHash('')
  }, [])

  const handleConfirmConfirmation = useCallback(() => {
    onVote()
  }, [onVote])

  const enoughBalance = useMemo(() => {
    return balance && inputValue && !balance.lessThan(inputValue)
  }, [inputValue, balance])

  const [approval, approveCallback] = useApproveCallback(inputValue, GOVERNANCE_ADDRESS)

  const claimBtn = useMemo(() => {
    const ret = {
      text: <>Claim</>,
      disable: true,
      event: handleClaimSubmit
    }

    if (!chainId) {
      ret.text = <>Connect wallet</>
      ret.disable = true
      return ret
    }
    if (chainId !== FACTORY_CHAIN_ID) {
      ret.text = <>Please switch to ETH chain</>
      ret.disable = true
      return ret
    }

    if (!JSBI.greaterThan(JSBI.BigInt(userStaking.totalStake), JSBI.BigInt(0))) {
      ret.disable = true
      return ret
    }

    if (getDeltaTime(userStaking.stakeEndTime)) {
      ret.text = (
        <>
          <Timer timer={+userStaking.stakeEndTime} onZero={() => {}} />
          {' can claim'}
        </>
      )
      ret.disable = true
      return ret
    }

    ret.disable = false
    return ret
  }, [userStaking, chainId, handleClaimSubmit])

  const btnStatus = useMemo(() => {
    const ret = {
      text: <>submit</>,
      event: () => {},
      disable: false
    }
    if (data.status === StatusOption.Failed || data.status === StatusOption.Success) {
      ret.text = <>Voting has ended</>
      ret.disable = true
      return ret
    }
    if (!chainId) {
      ret.text = <>Connect wallet</>
      ret.disable = true
      return ret
    }
    if (chainId !== FACTORY_CHAIN_ID) {
      ret.text = <>Please switch to ETH chain</>
      ret.disable = true
      return ret
    }

    if (!inputValue || (inputValue && !inputValue.greaterThan(JSBI.BigInt(0)))) {
      ret.text = <>Please input amount</>
      ret.disable = true
      return ret
    }

    if (!enoughBalance) {
      ret.text = <>Insufficient Balance</>
      ret.disable = true
      return ret
    }

    if (approval !== ApprovalState.APPROVED) {
      ret.event = approveCallback
      ret.text =
        approval === ApprovalState.PENDING ? (
          <>
            Allow Amitmatter to use your Matter<Dots>Loading</Dots>
          </>
        ) : (
          <>Allow Amitmatter to use your Matter</>
        )
      ret.disable = !!(approval === ApprovalState.PENDING)
      return ret
    }

    ret.text = <>submit</>
    ret.event = handleSubmit
    ret.disable = false
    return ret
  }, [inputValue, enoughBalance, data, approval, handleSubmit, approveCallback, chainId])

  if (!data) {
    return null
  }

  const { creator, title, voteFor, status, contents, voteAgainst, totalVotes, timeLeft, id } = data
  const disabled = 'Live' !== status
  const voteForPercentage = `${calcVoteForPercentage(VoteOption.FOR, voteFor, voteAgainst)}%`
  const voteAgainstPercentage = `${calcVoteForPercentage(VoteOption.AGAINST, voteFor, voteAgainst)}%`

  return (
    <>
      <Wrapper>
        <Card color={theme.bg1}>
          <AutoColumn>
            <DirectionChangeWrapper>
              <BackButtonWrapper>
                <ButtonEmpty width="106px" color={theme.text1} onClick={handleBackClick} marginRight={'auto'}>
                  <ChevronLeft style={{ marginRight: 16 }} />
                  Back
                </ButtonEmpty>

                <ShowSmall>
                  <Box display={'flex'} gridGap={8}>
                    <Live color={'Success' === status ? '#728AE0' : 'Failed' === status ? '#FF0000' : ''}>
                      {'Live' === status ? <Timer timer={+timeLeft} onZero={() => {}} /> : status}
                    </Live>
                    <Badge
                      style={{
                        color: theme.text1,
                        background: '#25252510',
                        padding: '6px 15px',
                        borderRadius: 30,
                        fontSize: 12
                      }}
                    >
                      #{id}
                    </Badge>
                    {/* <ShowSmall>
                  <ButtonEmpty width="auto" padding="0" onClick={handleBackClick}>
                    <X color={theme.text3} size={24} />
                  </ButtonEmpty>
                </ShowSmall> */}
                  </Box>
                </ShowSmall>
              </BackButtonWrapper>

              <div
                style={{
                  flexGrow: 1,
                  color: theme.text1,
                  display: 'grid',
                  justifyItems: 'center',
                  gap: 14,
                  padding: '0 15px'
                }}
              >
                <TYPE.largeHeader fontSize={36} textAlign="center" fontWeight={300} marginTop={16}>
                  {title}
                </TYPE.largeHeader>

                <CopyHelper toCopy={creator}>
                  <TYPE.smallGray textAlign="center" marginTop="4px">
                    {isAddress(creator) ? shortenAddress(creator) : creator}{' '}
                  </TYPE.smallGray>
                </CopyHelper>
              </div>
              <HideSmall>
                <Box display={'flex'} gridGap={8}>
                  <Live color={'Success' === status ? '#728AE0' : 'Failed' === status ? '#FF0000' : ''}>
                    {'Live' === status ? <Timer timer={+timeLeft} onZero={() => {}} /> : status}
                  </Live>
                  <Badge
                    style={{
                      color: theme.text1,
                      background: '#25252510',
                      padding: '6px 15px',
                      borderRadius: 30,
                      fontSize: 12
                    }}
                  >
                    #{id}
                  </Badge>
                  {/* <ShowSmall>
                  <ButtonEmpty width="auto" padding="0" onClick={handleBackClick}>
                    <X color={theme.text3} size={24} />
                  </ButtonEmpty>
                </ShowSmall> */}
                </Box>
              </HideSmall>
            </DirectionChangeWrapper>
            <Box marginTop={'50px'}>
              <DirectionChangeWrapper style={{ gap: 20 }}>
                <AutoColumn gap="28px" style={{ width: '100%' }}>
                  <TYPE.body lineHeight="25px" textAlign="center" style={{ wordBreak: 'break-all' }}>
                    {contents?.summary}
                  </TYPE.body>
                  <TYPE.body lineHeight="25px" textAlign="center" style={{ wordBreak: 'break-all' }}>
                    {contents?.details}
                  </TYPE.body>
                </AutoColumn>
                <Card color={theme.bg3}>
                  <AutoColumn style={{ width: '100%' }} gap="16px">
                    <TYPE.largeHeader color={theme.text1} fontWeight={100} textAlign="center">
                      {toNumber(totalVotes)}&nbsp;Votes
                    </TYPE.largeHeader>

                    <RowBetween>
                      <AutoColumn gap="4px" style={{ width: 220 }}>
                        <TYPE.mediumHeader textAlign={'left'}>
                          <span style={{ fontWeight: 100, marginLeft: 10 }}>{voteForPercentage}</span>
                        </TYPE.mediumHeader>
                        <TYPE.smallGray fontSize={14}>Votes For:</TYPE.smallGray>
                      </AutoColumn>
                      <AutoColumn gap="4px" style={{ width: 220, textAlign: 'right' }}>
                        <TYPE.mediumHeader>
                          <span style={{ fontWeight: 100, marginLeft: 10 }}>{voteAgainstPercentage}</span>
                        </TYPE.mediumHeader>
                        <TYPE.smallGray fontSize={14}>Votes Against:</TYPE.smallGray>
                      </AutoColumn>
                    </RowBetween>
                    <ProgressBar isLarge leftPercentage={voteForPercentage} />
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
                </Card>
              </DirectionChangeWrapper>
            </Box>
          </AutoColumn>
        </Card>
        <Card color={theme.bg1} marginTop={24}>
          <Box style={{ maxWidth: 760, width: '100%' }} justifyContent="center" gridGap="40px" margin="0 auto">
            <Card style={{ color: theme.text1 }}>
              <AutoColumn gap="24px" style={{ maxWidth: 468, margin: '4px auto' }} justify="center">
                <TYPE.mediumHeader textAlign="center">Make Your Decision</TYPE.mediumHeader>

                <DirectionChangeWrapper style={{ padding: '0 20px', marginBottom: -15, fontSize: 12 }}>
                  <span>My votes: {toNumber(userStaking.totalYes)}</span>
                  <HideSmall>
                    <span>My votes: {toNumber(userStaking.totalNo)}</span>
                  </HideSmall>
                </DirectionChangeWrapper>

                <DirectionChangeWrapper style={{ padding: '0 20px' }}>
                  <VoteOptionCard
                    selected={selected === VoteOption.FOR}
                    onClick={disabled ? undefined : handleSelect(VoteOption.FOR)}
                    disabled={disabled}
                  >
                    Vote For
                    {status === StatusOption.Live && selected === VoteOption.FOR && (
                      <TYPE.small>{Number(voteValue) ? voteValue : '-'} MATTER</TYPE.small>
                    )}
                  </VoteOptionCard>
                  <ShowSmall>
                    <span style={{ fontSize: 12, marginTop: 20 }}>My votes: {toNumber(userStaking.totalNo)}</span>
                  </ShowSmall>
                  <VoteOptionCard
                    selected={selected === VoteOption.AGAINST}
                    onClick={disabled ? undefined : handleSelect(VoteOption.AGAINST)}
                    disabled={disabled}
                  >
                    Vote Against
                    {status === StatusOption.Live && selected === VoteOption.AGAINST && (
                      <TYPE.small>{Number(voteValue) ? voteValue : '-'} MATTER</TYPE.small>
                    )}
                  </VoteOptionCard>
                </DirectionChangeWrapper>
                {data.status === StatusOption.Live && (
                  <div style={{ width: 'calc(100% - 40px)' }}>
                    <CurrencyInputPanel
                      value={voteValue}
                      onUserInput={value => {
                        setVoteValue(value)
                      }}
                      onMax={() => {
                        setVoteValue(balance ? balance.toSignificant() : '')
                      }}
                      showMaxButton={true}
                      currency={GOVERNANCE_TOKEN}
                      // pair={dummyPair}
                      label="Amount"
                      disableCurrencySelect={true}
                      customBalanceText={'Balance: '}
                      id="stake-vote-token"
                      hideSelect={true}
                    />
                  </div>
                )}
                {!disabled && (
                  <TYPE.smallGray textAlign="center">
                    {selected === VoteOption.FOR ? contents?.agreeFor : contents?.againstFor}
                  </TYPE.smallGray>
                )}
                {status === StatusOption.Live ? (
                  <ButtonPrimary maxWidth="320px" onClick={btnStatus.event} disabled={btnStatus.disable}>
                    {btnStatus.text}
                  </ButtonPrimary>
                ) : (
                  <ButtonPrimary maxWidth="320px" onClick={claimBtn.event} disabled={claimBtn.disable}>
                    {claimBtn.text}
                  </ButtonPrimary>
                )}
              </AutoColumn>
            </Card>
          </Box>
        </Card>
      </Wrapper>
      <Modal isOpen={NeutralSubmitted} onDismiss={handleNeutralDismiss}>
        <SubmittedModalContent submitType={submitType} onDismiss={handleNeutralDismiss} hash={txHash} />
      </Modal>
      <TransactionConfirmationModal
        isOpen={showConfirm}
        onDismiss={handleDismissConfirmation}
        attemptingTxn={attemptingTxn}
        hash={txHash}
        content={() =>
          ConfirmType.Vote === submitType ? (
            <ConfirmationModalContent
              voteValue={voteValue}
              voteOption={selected}
              onDismiss={handleDismissConfirmation}
              onConfirm={handleConfirmConfirmation}
            />
          ) : (
            <ConfirmationClaimModalContent
              totalStaking={toNumber(userStaking.totalStake)}
              onDismiss={handleDismissConfirmation}
              onConfirm={onClaim}
            />
          )
        }
        pendingText={'Waiting For Confirmation...'}
        submittedContent={() => (
          <SubmittedModalContent submitType={submitType} onDismiss={handleDismissConfirmation} hash={txHash} />
        )}
      />
    </>
  )
}

function ConfirmationModalContent({
  voteOption,
  onDismiss,
  voteValue,
  onConfirm
}: {
  voteOption: VoteOption
  voteValue: string | number
  onDismiss: () => void
  onConfirm: () => void
}) {
  const theme = useTheme()
  return (
    <AutoColumn justify="center" style={{ padding: 24, width: '100%' }} gap="20px">
      <RowBetween>
        <div style={{ width: 24 }} />
        <TYPE.body fontSize={18}>{voteOption === VoteOption.FOR ? 'Vote For' : 'Vote Against'}</TYPE.body>
        <ButtonEmpty width="auto" padding="0" onClick={onDismiss}>
          <X color={theme.text3} size={24} />
        </ButtonEmpty>
      </RowBetween>

      <TYPE.largeHeader fontSize={28} fontWeight={300}>
        {voteValue} MATTER
      </TYPE.largeHeader>
      <TYPE.body fontSize={14}>
        Are you sure you want to vote {voteOption === VoteOption.FOR ? 'For' : 'Against'}?
      </TYPE.body>
      <ModalButtonWrapper>
        <ButtonOutlinedPrimary marginRight="15px" onClick={onDismiss}>
          Cancel
        </ButtonOutlinedPrimary>
        <ButtonPrimary onClick={onConfirm}>Confirm</ButtonPrimary>
      </ModalButtonWrapper>
    </AutoColumn>
  )
}

function ConfirmationClaimModalContent({
  totalStaking,
  onDismiss,
  onConfirm
}: {
  totalStaking: string | number
  onDismiss: () => void
  onConfirm: () => void
}) {
  const theme = useTheme()
  return (
    <AutoColumn justify="center" style={{ padding: 24, width: '100%' }} gap="20px">
      <RowBetween>
        <div style={{ width: 24 }} />
        <TYPE.body fontSize={18}>Claim</TYPE.body>
        <ButtonEmpty width="auto" padding="0" onClick={onDismiss}>
          <X color={theme.text3} size={24} />
        </ButtonEmpty>
      </RowBetween>

      <TYPE.largeHeader fontSize={28} fontWeight={300}>
        {totalStaking} MATTER
      </TYPE.largeHeader>
      <TYPE.body fontSize={14}>Are you sure you want to claim?</TYPE.body>
      <ModalButtonWrapper>
        <ButtonOutlinedPrimary marginRight="15px" onClick={onDismiss}>
          Cancel
        </ButtonOutlinedPrimary>
        <ButtonPrimary onClick={onConfirm}>Confirm</ButtonPrimary>
      </ModalButtonWrapper>
    </AutoColumn>
  )
}

function SubmittedModalContent({
  submitType,
  onDismiss,
  hash,
  isError
}: {
  submitType: ConfirmType
  onDismiss: () => void
  hash: string | undefined
  isError?: boolean
}) {
  const notice =
    submitType === ConfirmType.Vote
      ? {
          error: (
            <>
              Oops! Your balance is not <br /> enought to vote against
            </>
          ),
          success: (
            <>
              Your vote against
              <br /> Is accepted successfully
            </>
          )
        }
      : {
          error: <>Oops! Claim transaction failed.</>,
          success: <>Claim Transaction submitted successfully.</>
        }

  return (
    <>
      <SubmittedView onDismiss={onDismiss} hash={hash} hideLink isError={isError}>
        <TYPE.body fontWeight={400} fontSize={18} textAlign="center">
          {isError ? notice.error : notice.success}
        </TYPE.body>
      </SubmittedView>
    </>
  )
}
