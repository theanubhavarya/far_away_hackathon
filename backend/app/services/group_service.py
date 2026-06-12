from app.schemas import GroupPayload, GroupTrip
from app.utils.helpers import new_id


GROUPS: dict[str, GroupTrip] = {}


def create_group(payload: GroupPayload) -> GroupTrip:
    destinations = payload.destination_options or ["Goa", "Manali", "Jaipur"]
    group = GroupTrip(
        group_id=new_id("group"),
        group_name=payload.group_name,
        members=payload.members,
        destination_votes={name: 0 for name in destinations},
        budget_per_person=payload.budget_per_person,
        total_budget=payload.budget_per_person * len(payload.members),
        status="VOTING",
    )
    GROUPS[group.group_id] = group
    return group


def vote(group_id: str, destination: str, member: str) -> dict[str, dict[str, int]]:
    group = GROUPS[group_id]
    votes = dict(group.destination_votes)
    votes[destination] = votes.get(destination, 0) + 1
    GROUPS[group_id] = group.model_copy(update={"destination_votes": votes})
    return {"votes": votes}
