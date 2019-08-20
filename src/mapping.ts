import { Address, BigInt } from '@graphprotocol/graph-ts'

import {
  Propose as ProposeEvent,
  HumanityGovernance,
} from '../generated/HumanityGovernance/HumanityGovernance'
import { Apply as ApplyEvent } from '../generated/TwitterHumanityApplicant/TwitterHumanityApplicant'
import { Proposer, Proposal } from '../generated/schema'

const proposalResultPending = 'PENDING'

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
  proposal.countYesVotes = humanityGovernance.proposalFee()
  proposal.countNoVotes = BigInt.fromI32(0)
  proposal.save()
}

export function handleApply(event: ApplyEvent): void {}

function getHumanityGovernanceInstance(address: Address): HumanityGovernance {
  return HumanityGovernance.bind(address)
}
