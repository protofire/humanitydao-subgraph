import {
  Execute as ExecuteEvent,
  Propose as ProposeEvent,
  RemoveVote as RemoveVoteEvent,
  Terminate as TerminateEvent,
  Vote as VoteEvent
} from "../generated/Contract/Contract"
import {
  Execute,
  Propose,
  RemoveVote,
  Terminate,
  Vote
} from "../generated/schema"

export function handleExecute(event: ExecuteEvent): void {
  let entity = new Execute(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.proposalId = event.params.proposalId
  entity.save()
}

export function handlePropose(event: ProposeEvent): void {
  let entity = new Propose(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.proposalId = event.params.proposalId
  entity.proposer = event.params.proposer
  entity.target = event.params.target
  entity.data = event.params.data
  entity.save()
}

export function handleRemoveVote(event: RemoveVoteEvent): void {
  let entity = new RemoveVote(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.proposalId = event.params.proposalId
  entity.voter = event.params.voter
  entity.save()
}

export function handleTerminate(event: TerminateEvent): void {
  let entity = new Terminate(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.proposalId = event.params.proposalId
  entity.save()
}

export function handleVote(event: VoteEvent): void {
  let entity = new Vote(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.proposalId = event.params.proposalId
  entity.voter = event.params.voter
  entity.approve = event.params.approve
  entity.weight = event.params.weight
  entity.save()
}
