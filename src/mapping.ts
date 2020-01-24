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
import { Human, Proposer, ProposerHumanVote, GlobalResult } from '../generated/schema'

const statusPending = 'PENDING'
const statusApproved = 'APPROVED'
const statusRejected = 'REJECTED'
let ONE = BigInt.fromI32(1)
let ZERO = BigInt.fromI32(0)

export function handlePropose(event: ProposeEvent): void {
  let humanityGovernance = getHumanityGovernanceInstance(event.address)

  let humanId = event.params.proposalId.toHex()

  let proposerId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let proposer = new Proposer(proposerId)
  proposer.address = humanityGovernance.proposals(event.params.proposalId).value4.toHex()
  proposer.save()

  let human = new Human(humanId)
  human.twitter = '' // we will fill this field in handleApply
  human.address = '' // we will fill this field in handleApply
  human.proposer = proposerId
  human.status = statusPending
  human.countYesVotes = humanityGovernance.proposalFee()
  human.countNoVotes = ZERO
  human.save()

  let proposerHumanVotesId = humanId + '-' + proposerId
  let proposerHumanVotes = new ProposerHumanVote(proposerHumanVotesId)
  proposerHumanVotes.countYesVotes = human.countYesVotes
  proposerHumanVotes.countNoVotes = ZERO
  proposerHumanVotes.proposer = proposerId
  proposerHumanVotes.human = humanId
  proposerHumanVotes.save()

  let globalResult = getGlobalResultEntity()
  globalResult.countPending = globalResult.countPending.plus(ONE)
  globalResult.save()
}

export function handleApply(event: ApplyEvent): void {
  let humanId = event.params.proposalId.toHex()
  let human = Human.load(humanId)

  if (human == null) {
    log.critical('handleApply: Human with id {} not found.', [humanId])
  }

  human.twitter = event.params.username
  human.address = event.params.applicant.toHex()
  human.save()
}

export function handleVote(event: VoteEvent): void {
  let humanityGovernance = getHumanityGovernanceInstance(event.address)

  let proposerId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let proposer = new Proposer(proposerId)
  proposer.address = humanityGovernance.proposals(event.params.proposalId).value4.toHex()
  proposer.save()

  // Load Human
  let humanId = event.params.proposalId.toHex()
  let human = Human.load(humanId)
  if (human == null) {
    log.critical('handleVote: Human with id {} not found', [humanId])
  }

  // Load ProposerHumanVotes
  let proposerHumanVotesId = human.id + '-' + event.params.voter.toHex()
  let proposerHumanVotes = ProposerHumanVote.load(proposerHumanVotesId)

  // voter is different than proposer
  if (proposerHumanVotes == null) {
    proposerHumanVotes = new ProposerHumanVote(proposerHumanVotesId)
    proposerHumanVotes.countYesVotes = ZERO
    proposerHumanVotes.countNoVotes = ZERO
    proposerHumanVotes.proposer = proposerId
    proposerHumanVotes.human = humanId
  }

  let weight = event.params.weight
  if (event.params.approve) {
    human.countYesVotes = human.countYesVotes.plus(weight)
    proposerHumanVotes.countYesVotes = proposerHumanVotes.countYesVotes.plus(weight)
  } else {
    human.countNoVotes = human.countNoVotes.plus(weight)
    proposerHumanVotes.countNoVotes = proposerHumanVotes.countNoVotes.plus(weight)
  }

  human.save()
  proposerHumanVotes.save()
}

export function handleRemoveVote(event: RemoveVoteEvent): void {
  // Load human
  let humanId = event.params.proposalId.toHex()
  let human = Human.load(humanId)
  if (human == null) {
    log.critical('handleRemoveVote: Human with id {} not found id', [humanId])
  }

  // Load ProposerHumanVotes
  let proposerHumanVotesId = human.id + '-' + event.params.voter.toHex()
  let proposerHumanVotes = ProposerHumanVote.load(proposerHumanVotesId)
  if (proposerHumanVotes == null) {
    log.critical('handleRemoveVote: ProposerHumanVote with id {} not found', [
      proposerHumanVotesId,
    ])
  }

  human.countYesVotes = human.countYesVotes.minus(proposerHumanVotes.countYesVotes)
  human.countNoVotes = human.countNoVotes.minus(proposerHumanVotes.countNoVotes)
  human.save()

  proposerHumanVotes.countYesVotes = ZERO
  proposerHumanVotes.countNoVotes = ZERO
  proposerHumanVotes.save()
}

export function handleExecute(event: ExecuteEvent): void {
  let humanId = event.params.proposalId.toHex()
  let human = Human.load(humanId)
  if (human == null) {
    log.critical('handleVote: Human with id {} not found id', [humanId])
  }

  human.status = statusApproved
  human.save()

  let globalResult = getGlobalResultEntity()
  globalResult.countApproved = globalResult.countApproved.plus(ONE)
  globalResult.countPending = globalResult.countPending.minus(ONE)
  globalResult.save()
}

export function handleTerminate(event: TerminateEvent): void {
  let humanId = event.params.proposalId.toHex()
  let human = Human.load(humanId)
  if (human == null) {
    log.critical('handleVote: Human with id {} not found id', [humanId])
  }

  human.status = statusRejected
  human.save()

  let globalResult = getGlobalResultEntity()
  globalResult.countRejected = globalResult.countRejected.plus(ONE)
  globalResult.countPending = globalResult.countPending.minus(ONE)
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
    globalResult.countApproved = ZERO
    globalResult.countRejected = ZERO
    globalResult.countPending = ZERO
  }

  return globalResult as GlobalResult
}
