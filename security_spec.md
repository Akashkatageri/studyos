# Security Specification

## Data Invariants
1. **User Profiles (`users/{userId}`)**: Can only be created and updated by the authenticated user matching `userId`. Immutable field `uid` must match `userId`.
2. **Settings (`settings/{userId}`)**: Read and write access is strictly limited to the owner `userId`.
3. **Study Stats (`studyStats/{userId}`)**: Read and write access is strictly limited to the owner `userId`.
4. **Usernames (`usernames/{username}`)**: Read is public. Creating is allowed only for authenticated users where `uid` matches `request.auth.uid`. No updates allowed.
5. **Friendships (`friendships/{friendshipId}`)**: Read, update, and delete allowed only if the authenticated user's `uid` is in the `uids` list.
6. **Friends Cache (`friends/{userId}`)**: Read and write allowed only for the owner `userId`.
7. **Friend Requests (`friendRequests/{requestId}`)**: Sender can create/cancel; receiver can accept/decline. Must contain valid UIDs matching the authenticated sender or receiver.
8. **Notifications (`notifications/{notificationId}`)**: Any authenticated user can create a notification to alert friends. Only the recipient (`userId`) can read, update, or delete.
9. **Activities (`activities/{activityId}`)**: Any authenticated user can read activities. Only the creator (`userId`) can create, update, or delete.
10. **Leaderboards (`leaderboards/{docId}`)**: Publicly readable. Writable only by administrative/system accounts (blocked for standard clients).

## The "Dirty Dozen" Payloads (Attacks & Exploits)
1. **Spoof User ID Profile Update**: User A attempts to update User B's profile.
2. **Change Immutable UID**: User A tries to modify their own profile, changing their `uid` field to User B's UID.
3. **Impersonate Username Registration**: User A registers a username but sets the associated `uid` in the payload to User B's UID.
4. **Read Private Settings**: User A attempts to read User B's settings.
5. **Modify Another's Study Stats**: User A attempts to overwrite User B's study statistics.
6. **Inject Massive ID / Value Poisoning**: User A attempts to write a 1MB string or invalid type as a document ID or field value (e.g. `streak: true` or `level: "massive_string"`).
7. **Bypass Friendship Access**: User A attempts to read/delete friendship details of User B and User C without being in `uids`.
8. **PII Leak on Users Collection**: Unauthorized read on restricted fields.
9. **Hijack Notifications**: User A attempts to read/delete notifications belonging to User B.
10. **Spoof Activities**: User A attempts to write activity feed items under User B's name and `userId`.
11. **Overwrite Leaderboard**: Standard authenticated client attempts to overwrite the top leaderboard document.
12. **Malicious Friend Request Manipulation**: User A tries to approve a pending request on behalf of User B by modifying the status to `accepted` without being the receiver.

## Test Cases for firestore.rules
The validation rules are strictly tested to prevent unauthorized access. The ruleset enforces type-safety, boundaries, and identity synchronization across all collections.
