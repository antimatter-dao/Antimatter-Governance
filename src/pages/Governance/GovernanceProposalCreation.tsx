import { TokenAmount, JSBI, Token } from '@uniswap/sdk'
import React, { useCallback, useMemo, useState } from 'react'
import { useWeb3React } from '@web3-react/core'
import { X } from 'react-feather'
import styled from 'styled-components'
import { makeStyles } from '@material-ui/core/styles'
import Stepper from '@material-ui/core/Stepper'
import Step from '@material-ui/core/Step'
import StepButton from '@material-ui/core/StepButton'
import useTheme from 'hooks/useTheme'
import { RowBetween } from 'components/Row'
import { ButtonEmpty, ButtonPrimary, ButtonOutlinedPrimary } from 'components/Button'
import { AutoColumn } from 'components/Column'
import { TYPE } from 'theme'
import TextInput from 'components/TextInput'
import { useTokenBalance } from 'state/wallet/hooks'
import TransactionConfirmationModal from 'components/TransactionConfirmationModal'
import { SubmittedView } from 'components/ModalViews'
import { useTransactionAdder } from 'state/transactions/hooks'
import { useApproveCallback, ApprovalState } from 'hooks/useApproveCallback'
import { tryParseAmount } from 'state/swap/hooks'
import { useGovernanceCreation } from 'hooks/useGovernanceDetail'
import { FACTORY_CHAIN_ID, GOVERNANCE_ADDRESS, MATTER_ADDRESS } from '../../constants'
import { Dots } from 'components/swap/styleds'
import Modal from 'components/Modal'
import { Box } from '@material-ui/core'

enum FormSteps {
  description = 'Proposal Description',
  settings = 'Proposal Settings',
  confirmation = 'Creation Monica Proposal'
}

// const Warning = styled.div`
//   background-color: ${({ theme }) => theme.red1};
//   border-radius: 14px;
//   padding: 16px;
//   width: 100%;
//   margin: 30px 0;
//   text-align: center;
// `

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

const stakeAmount = 100000

const fields = {
  title: 'Title',
  details: 'Details',
  description: 'Project Description',
  agreeFor: 'For',
  againstFor: 'Against'
}

export default function GovernanceProposalCreation({ onDismiss, isOpen }: { onDismiss: () => void; isOpen: boolean }) {
  const [formStep, setFormStep] = useState(FormSteps.description)
  const [activeStep, setActiveStep] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [input, setInput] = useState<any>({ title: '', summary: '', agreeFor: '', againstFor: '' })
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const theme = useTheme()

  const governanceCreateCallback = useGovernanceCreation()
  const addTransaction = useTransactionAdder()
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false)
  const [txHash, setTxHash] = useState<string>('')
  const { chainId, account } = useWeb3React()

  const balance: TokenAmount | undefined = useTokenBalance(
    account ?? undefined,
    chainId ? new Token(chainId, MATTER_ADDRESS, 18) : undefined
  )
  const notEnoughBalance = !balance?.greaterThan(JSBI.BigInt(stakeAmount))

  const [approval, approveCallback] = useApproveCallback(
    tryParseAmount(JSBI.BigInt(stakeAmount).toString(), chainId ? new Token(chainId, MATTER_ADDRESS, 18) : undefined),
    chainId ? GOVERNANCE_ADDRESS : undefined
  )

  const handleStep = (step: number) => () => {
    setActiveStep(step)
  }

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    setTxHash('')
  }, [])

  const handleSubmit = useCallback(e => {
    e.preventDefault()
    const formData = new FormData(e.target).entries()
    const input: { [key: string]: any } = {}
    let error = ''
    for (const pair of formData) {
      if (!pair[1]) {
        error += ', ' + fields[pair[0] as keyof typeof fields]
      }
      input[pair[0]] = pair[1]
    }
    setError(error ? 'Following fields are incomplete:' + error.slice(1) : '')

    if (!error) {
      setShowConfirm(true)
      setInput(input)
    }
  }, [])

  const onCreate = useCallback(async () => {
    if (!governanceCreateCallback) return
    if (approval !== ApprovalState.APPROVED) {
      return
    }

    const _span =
      activeStep !== 10 ? JSBI.BigInt((activeStep + 3) * 60 * 60 * 24).toString() : JSBI.BigInt(5 * 60).toString()

    const args = [
      input.title,
      `{"summary":"${input.summary}","details":"${input.details}","agreeFor":"${input.agreeFor}","againstFor":"${input.againstFor}"}`,
      _span,
      tryParseAmount(
        JSBI.BigInt(stakeAmount).toString(),
        chainId ? new Token(chainId, MATTER_ADDRESS, 18) : undefined
      )?.raw.toString()
    ]

    setAttemptingTxn(true)

    const res = governanceCreateCallback(args)
    res
      .then(response => {
        setAttemptingTxn(false)
        setInput({ title: '', summary: '', agreeFor: '', againstFor: '' })
        addTransaction(response, {
          summary: 'Create proposal "' + input.title + '"'
        })
        setTxHash(response.hash)
      })
      .catch(error => {
        setAttemptingTxn(false)
        setTxHash('error')
        if (error?.code !== 4001) {
          setSubmitError(error)
          console.error('---->', error)
        }
      })
  }, [activeStep, addTransaction, approval, governanceCreateCallback, chainId, input])

  const btnStatus = useMemo(() => {
    const ret = {
      text: <>Determine</>,
      disable: false,
      event: (e: any): void => {
        e.preventDefault()
      }
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

    if (notEnoughBalance) {
      ret.text = <>You must have {stakeAmount} MATTER to create a proposal</>
      ret.disable = true
      return ret
    }

    if (approval !== ApprovalState.APPROVED) {
      ret.text =
        approval === ApprovalState.PENDING ? (
          <>
            Allow Amitmatter to use your Matter<Dots>Loading</Dots>
          </>
        ) : (
          <>Allow Amitmatter to use your Matter</>
        )
      ret.disable = !!(approval === ApprovalState.PENDING)
      ret.event = (e): void => {
        e.preventDefault()
        approveCallback()
      }
      return ret
    }

    ret.text = <>Determine</>
    ret.event = () => {}
    ret.disable = false
    return ret
  }, [notEnoughBalance, chainId, approval, approveCallback])

  const createForm = useMemo(() => {
    if (formStep === FormSteps.description) {
      return (
        <>
          <TextInput
            label={fields.title}
            placeholder="Enter your project name"
            name="title"
            formHelperText="Keep it below 10 words"
          />
          <TextInput
            label={fields.description}
            placeholder="What will be done if the proposal is implement"
            name="description"
            formHelperText="Keep it below 200 words"
          />
          <TextInput
            label={fields.details}
            placeholder="Write a Longer motivation with links and references if necessary"
            name="details"
            formHelperText="This is optional"
          />
          <ButtonPrimary onClick={() => setFormStep(FormSteps.settings)}>Next Step</ButtonPrimary>
        </>
      )
    }

    if (formStep === FormSteps.settings) {
      return (
        <>
          <TYPE.smallHeader fontSize={22}>Proposal Settings</TYPE.smallHeader>
          <TextInput label={fields.agreeFor} placeholder="Formulate clear for position" name="agreeFor" />
          <TextInput label={fields.againstFor} placeholder="Formulate clear Against position" name="againstFor" />
          <TYPE.smallHeader fontSize={22}>Proposal Timing</TYPE.smallHeader>
          <TYPE.darkGray>Please set a time frame for the proposal. Select the number of days below</TYPE.darkGray>
          {error && <TYPE.body color={theme.red1}>{error}</TYPE.body>}
          <GovernanceTimeline activeStep={activeStep} onStep={handleStep} disabled={false} />

          <Box display="flex" justifyContent="space-between" gridGap="16px">
            <ButtonOutlinedPrimary onClick={() => setFormStep(FormSteps.description)}>Back</ButtonOutlinedPrimary>
            <ButtonPrimary onClick={() => setFormStep(FormSteps.confirmation)}>Launch</ButtonPrimary>
          </Box>
        </>
      )
    }

    return (
      <>
        <TYPE.smallHeader fontSize={20} fontWeight={400}>
          Description
        </TYPE.smallHeader>
        <TYPE.body sx={{ opacity: 0.5 }}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
          consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id
          est laborum.
        </TYPE.body>
        <TYPE.smallHeader fontSize={20} fontWeight={400}>
          Detail
        </TYPE.smallHeader>
        <TYPE.body sx={{ opacity: 0.5 }}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
          consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id
          est laborum.
        </TYPE.body>
        <TYPE.smallHeader fontSize={20} fontWeight={400}>
          Proposal Settings
        </TYPE.smallHeader>
        <ButtonPrimary
          type="submit"
          onClick={btnStatus.event}
          disabled={btnStatus.disable}
          style={{ maxWidth: 416, margin: '0 auto' }}
        >
          {btnStatus.text}
        </ButtonPrimary>
      </>
    )
  }, [btnStatus, formStep])

  return (
    <>
      <TransactionConfirmationModal
        isOpen={showConfirm}
        onDismiss={handleDismissConfirmation}
        attemptingTxn={attemptingTxn}
        hash={txHash}
        content={() => <ConfirmationModalContent onDismiss={handleDismissConfirmation} onConfirm={onCreate} />}
        pendingText={'Waiting For Confirmation...'}
        submittedContent={() => (
          <SubmittedModalContent onDismiss={handleDismissConfirmation} hash={txHash} isError={!!submitError} />
        )}
      />
      <Modal isOpen={isOpen} onDismiss={onDismiss} maxWidth={660}>
        <Box position="relative">
          <ButtonEmpty
            width="auto"
            padding="0"
            onClick={onDismiss}
            style={{ position: 'absolute', right: 20, top: 20 }}
          >
            <X color={theme.text3} size={24} />
          </ButtonEmpty>
          <Box padding="38px 60px 40px">
            <form name="GovernanceCreationForm" id="GovernanceCreationForm" onSubmit={handleSubmit}>
              <TYPE.smallHeader fontSize={12} mb={14} sx={{ opacity: 0.5 }}>
                New Proposal Creation
              </TYPE.smallHeader>
              <Box>
                <TYPE.largeHeader fontSize={40}>{formStep}</TYPE.largeHeader>
              </Box>
              <Box mt={'44px'} display="flex" flexDirection="column" gridGap={32}>
                {createForm}
              </Box>
            </form>
            {/* {notEnoughBalance && <Warning>You must have {stakeAmount} MATTER to create a proposal</Warning>} */}
          </Box>
        </Box>
      </Modal>
    </>
  )
}

function GovernanceTimeline({
  activeStep,
  onStep,
  disabled
}: {
  activeStep: number
  onStep: (step: number) => () => void
  disabled: boolean
}) {
  const theme = useTheme()

  const useStyles = useCallback(
    () =>
      makeStyles({
        root: {
          width: '100%',
          '& .MuiPaper-root': {
            backgroundColor: 'transparent'
          },
          '& text': {
            stroke: 'transparent',
            fill: 'transparent'
          },
          '& path': {
            stroke: 'transparent',
            fill: 'transparent'
          }
        },
        step: {
          '& svg': {
            overflow: 'visible'
          },
          '& circle': {
            fill: theme.bg5
          },
          '& .MuiStepLabel-label': {
            color: theme.text4,
            fontSize: 16
          },
          '& .MuiStepIcon-active circle': {
            fill: theme.primary1,
            stroke: theme.primary4,
            strokeWidth: 4
          },
          '& .MuiStepLabel-active': {
            color: theme.text1,
            fontWeight: 500
          },
          '& .MuiStepConnector-root': {
            left: 'calc(-50% + 10px)',
            right: 'calc(50% + 11px)'
          },
          '& .MuiStepButton-root': {
            zIndex: 2
          }
        }
      }),
    [theme]
  )
  const classes = useStyles()()

  return (
    <div className={classes.root}>
      <Stepper alternativeLabel nonLinear activeStep={activeStep}>
        {[3, 4, 5, 6, 7].map((label, index) => {
          return (
            <Step key={label} active={activeStep === index} className={classes.step} disabled={disabled}>
              <StepButton onClick={onStep(index)}>{label}days</StepButton>
            </Step>
          )
        })}
        {/* test */}
        {/* <Step key={10} active={activeStep === 10} className={classes.step} disabled={disabled}>
          <StepButton onClick={onStep(10)}>5 mins</StepButton>
        </Step> */}
      </Stepper>
      <div></div>
    </div>
  )
}

function ConfirmationModalContent({ onDismiss, onConfirm }: { onDismiss: () => void; onConfirm: () => any }) {
  const theme = useTheme()
  return (
    <AutoColumn justify="center" style={{ padding: 24, width: '100%' }} gap="20px">
      <RowBetween>
        <div style={{ width: 24 }} />
        <ButtonEmpty width="auto" padding="0" onClick={onDismiss}>
          <X color={theme.text3} size={24} />
        </ButtonEmpty>
      </RowBetween>

      <TYPE.body fontSize={16}>
        You will stack {stakeAmount} MATTER
        <br /> to submit this proposal
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

function SubmittedModalContent({
  onDismiss,
  hash,
  isError
}: {
  onDismiss: () => void
  hash: string | undefined
  isError?: boolean
}) {
  return (
    <>
      <SubmittedView onDismiss={onDismiss} hash={hash} hideLink isError={isError}>
        <TYPE.body fontWeight={400} fontSize={18} textAlign="center">
          {isError ? (
            <>
              There is a unexpected error, <br /> please try again
            </>
          ) : (
            <>
              You have successfully
              <br /> created an proposal
            </>
          )}
        </TYPE.body>
      </SubmittedView>
    </>
  )
}
