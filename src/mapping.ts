import { Address, BigInt, log } from '@graphprotocol/graph-ts'

import {
  Execute as ExecuteEvent,
  Propose as ProposeEvent,
  RemoveVote as RemoveVoteEvent,
  Terminate as TerminateEvent,
  Vote as VoteEvent,
  HumanityGovernance,
} from '../generated/HumanityGovernance/HumanityGovernance'
import { Apply as ApplyEvent } from '../generated/TwitterHumanityApplicant/TwitterHumanityApplicant'
import { Proposer, Proposal, ProposalVote, GlobalResult } from '../generated/schema'

const proposalResultPending = 'PENDING'
const proposalResultApproved = 'APPROVED'
const proposalResultRejected = 'REJECTED'
let ONE = BigInt.fromI32(1)
let ZERO = BigInt.fromI32(0)

export function handlePropose(event: ProposeEvent): void {
  let proposerId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let proposer = new Proposer(proposerId)
  proposer.address = '' // we will fill this field in handleApply
  proposer.save()

  let humanityGovernance = getHumanityGovernanceInstance(event.address)

  let proposalId = event.params.proposalId.toHex()
  let proposal = new Proposal(proposalId)
  proposal.proposalData = '' // we will fill this field in handleApply
  proposal.proposer = proposerId
  proposal.result = proposalResultPending
  proposal.cantYesVotes = humanityGovernance.proposalFee()
  proposal.cantNoVotes = ZERO
  proposal.save()

  let proposalVote = new ProposalVote(proposalId + '-' + proposerId)
  proposalVote.cantYesVotes = proposal.cantYesVotes
  proposalVote.cantNoVotes = ZERO
  proposalVote.save()

  let globalResult = getGlobalResultEntity()
  globalResult.cantPending = globalResult.cantPending.plus(ONE)
  globalResult.save()
}

export function handleApply(event: ApplyEvent): void {
  let proposalId = event.params.proposalId.toHex()
  let proposal = Proposal.load(proposalId)

  if (proposal == null) {
    log.critical('handleApply: Proposal with id {} not found.', [proposalId])
  }

  let proposer = Proposer.load(proposal.proposer)
  if (proposer == null) {
    log.critical('handleApply: Proposer with id {} not found', [proposal.proposer])
  }

  proposal.proposalData = event.params.username
  proposal.save()

  proposer.address = event.params.applicant.toHex()
  proposer.save()
}

export function handleVote(event: VoteEvent): void {
  // Load proposal
  let proposalId = event.params.proposalId.toHex()
  let proposal = Proposal.load(proposalId)
  if (proposal == null) {
    log.critical('handleVote: Proposal with id {} not found', [proposalId])
  }

  // Load proposalVotes
  let proposalVotesId = proposal.id + '-' + event.params.voter.toHex()
  let proposalVote = ProposalVote.load(proposalVotesId)
  // voter is different than proposer
  if (proposalVote == null) {
    proposalVote = new ProposalVote(proposalVotesId)
    proposalVote.cantYesVotes = ZERO
    proposalVote.cantNoVotes = ZERO
  }

  let weight = event.params.weight
  if (event.params.approve) {
    proposal.cantYesVotes = proposal.cantYesVotes.plus(weight)
    proposalVote.cantYesVotes = proposalVote.cantYesVotes.plus(weight)
  } else {
    proposal.cantNoVotes = proposal.cantNoVotes.plus(weight)
    proposalVote.cantNoVotes = proposalVote.cantNoVotes.plus(weight)
  }

  proposal.save()
  proposalVote.save()
}

export function handleRemoveVote(event: RemoveVoteEvent): void {
  // Load proposal
  let proposalId = event.params.proposalId.toHex()
  let proposal = Proposal.load(proposalId)
  if (proposal == null) {
    log.critical('handleRemoveVote: Proposal with id {} not found id', [proposalId])
  }

  // Load proposalVotes
  let proposalVotesId = proposal.id + '-' + event.params.voter.toHex()
  let proposalVote = ProposalVote.load(proposalVotesId)
  if (proposalVote == null) {
    log.critical('handleRemoveVote: ProposalVotes with id {} not found', [
      proposalVotesId,
    ])
  }

  proposal.cantYesVotes = proposal.cantYesVotes.minus(proposalVote.cantYesVotes)
  proposal.cantNoVotes = proposal.cantNoVotes.minus(proposalVote.cantNoVotes)
  proposal.save()

  proposalVote.cantYesVotes = ZERO
  proposalVote.cantNoVotes = ZERO
  proposalVote.save()
}

export function handleExecute(event: ExecuteEvent): void {
  let proposalId = event.params.proposalId.toHex()
  let proposal = Proposal.load(proposalId)
  if (proposal == null) {
    log.critical('handleVote: Proposal with id {} not found id', [proposalId])
  }

  proposal.result = proposalResultApproved
  proposal.save()

  let globalResult = getGlobalResultEntity()
  globalResult.cantApproved = globalResult.cantApproved.plus(ONE)
  globalResult.cantPending = globalResult.cantPending.minus(ONE)
  globalResult.save()
}

export function handleTerminate(event: TerminateEvent): void {
  let proposalId = event.params.proposalId.toHex()
  let proposal = Proposal.load(proposalId)
  if (proposal == null) {
    log.critical('handleVote: Proposal with id {} not found id', [proposalId])
  }

  proposal.result = proposalResultRejected
  proposal.save()

  let globalResult = getGlobalResultEntity()
  globalResult.cantRejected = globalResult.cantRejected.plus(ONE)
  globalResult.cantPending = globalResult.cantPending.minus(ONE)
  globalResult.save()
}

function getHumanityGovernanceInstance(address: Address): HumanityGovernance {
  return HumanityGovernance.bind(address)
}

function getGlobalResultEntity(): GlobalResult {
  let globalId = '0x0'
  let globalResult = GlobalResult.load(globalId)

  if (globalResult == null) {
    globalResult = new GlobalResult(globalId)
    globalResult.cantApproved = ZERO
    globalResult.cantRejected = ZERO
    globalResult.cantPending = ZERO
  }

  return globalResult as GlobalResult
}
