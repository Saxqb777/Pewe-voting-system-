/**
 * Every piece of text a voter or an admin can see lives in this one file.
 * To translate the app into another language, copy this object, translate the
 * values and export the copy instead. No other file needs to change.
 *
 * House rule for this project: no dashes of any kind in user facing text.
 */

export const strings = {
  common: {
    appName: "Village Election",
    testBanner: "TEST MODE. This is a practice run. Nothing here counts.",
    loading: "Please wait",
    back: "Back",
    cancel: "Cancel",
    somethingWentWrong: "Something went wrong. Please try again.",
    errorTitle: "Something went wrong",
    errorLead:
      "The page could not load. Your vote has not been affected. Please wait a moment and try again.",
    errorRetry: "Try again",
    errorContact:
      "If it keeps happening, please contact the election admin.",
    notFoundTitle: "Page not found",
    notFoundLead: "Please use the link that was shared in the group.",
    slowConnectionHint: "If nothing happens, wait a moment and try once more.",
  },

  entry: {
    title: "Village Election",
    subtitle: "Enter your Voter ID to begin",
    label: "Voter ID",
    placeholder: "Your Voter ID",
    submit: "Continue",
    checking: "Checking",
    // One generic message for every failure, so nobody can use this screen to
    // find out which IDs exist or which people have already voted.
    generic: "That Voter ID cannot be used. Please check it and try again.",
    locked:
      "Too many attempts from this phone. Please contact the election admin.",
    closed: "Voting is closed. Thank you.",
    notReady: "Voting has not opened yet. Please try again later.",
    opensAt: (when: string) => `Voting opens on ${when}. Please come back then.`,
    help: "Your Voter ID was given to you by the election admin.",
    closesAt: (when: string) => `Voting closes on ${when}`,
    whatHappensHeading: "What happens next",
    whatHappens: (n: number) => [
      `You will see all the names. Choose exactly ${n} of them.`,
      "You can search for a name, and change your mind before you confirm.",
      "You can vote once only, so check your choices carefully.",
      "Nobody can see who you voted for. Not the admin, not anyone.",
    ],
  },

  ballot: {
    title: "Choose your candidates",
    instruction: (n: number) => `Select exactly ${n} names.`,
    searchPlaceholder: "Search for a name",
    noResults: "No name matches that search.",
    counter: (selected: number, total: number) =>
      `${selected} of ${total} selected`,
    needMore: (n: number) => (n === 1 ? "Select 1 more" : `Select ${n} more`),
    tooMany: (n: number) =>
      n === 1 ? "Remove 1 name" : `Remove ${n} names`,
    review: "Review my choices",
    selectedHeading: "Your selection",
    clearAll: "Clear all",
    alreadyFull: (n: number) =>
      `You already have ${n} names. Remove one before adding another.`,
  },

  confirm: {
    title: "Confirm your vote",
    lead: "These are your choices. This is your last chance to change them.",
    warning: "Once you confirm, your vote cannot be changed.",
    change: "Go back and change",
    submit: "Confirm and submit my vote",
    submitting: "Sending your vote",
  },

  done: {
    title: "Thank you",
    lead: "Your vote has been recorded.",
    anonymity:
      "Your vote is stored separately from your name. Nobody, including the admin, can see who you voted for.",
    close: "You can close this page now.",
  },

  already: {
    title: "Already voted",
    lead: "This Voter ID has already been used.",
    help: "If you believe this is a mistake, please contact the election admin.",
  },

  closed: {
    title: "Voting is closed",
    lead: "Thank you. No more votes can be accepted.",
  },

  setup: {
    title: "Setup not finished",
    lead: "The app is running, but these settings need fixing before the election can be used. Change them where you host the app, then reload this page.",
    settingLabel: "Setting",
    problemLabel: "What is wrong",
    reload: "Reload",
    safe: "Nothing has been lost. No voter can reach the ballot until this is fixed.",
  },

  admin: {
    title: "Admin",
    passwordLabel: "Admin password",
    signIn: "Sign in",
    signOut: "Sign out",
    wrongPassword: "Wrong password.",
    tooManyAttempts: "Too many attempts. Please wait and try again.",

    turnoutHeading: "Turnout",
    turnout: (voted: number, total: number) =>
      `${voted} of ${total} voted`,
    ballotsInBox: (n: number) => `${n} ballots in the ballot box`,
    autoRefresh: "This number updates on its own every 10 seconds.",

    pendingHeading: "Not voted yet",
    pendingEmpty: "Everyone has voted.",
    copyPending: "Copy this list",
    copied: "Copied",

    flagsHeading: "Flags",
    flagsNote:
      "These are warnings only. Nobody is ever blocked automatically. Use your own judgement.",
    flagsEmpty: "No flags.",
    flagSharedDevice: "Same phone used by more than one voter",
    flagSharedIp: "Same network used by several voters",
    flagFailedAttempts: "Voter with repeated failed attempts",
    flagLocked: "Voter locked out",

    unlock: "Unlock",
    resetVote: "Allow this person to vote again",
    resetVoteConfirm:
      "This clears their voted mark so they can vote again. Their existing ballot stays in the ballot box and cannot be found or removed. Continue?",

    closeVotingHeading: "Close voting",
    closeVoting: "Close voting now",
    closeVotingConfirm:
      "This ends the election. No more votes can be cast. Results become visible. Continue?",
    votingClosedAt: (when: string) => `Voting closed at ${when}`,
    reopenVoting: "Reopen voting",

    resultsHidden: "Results are hidden until voting is closed.",
    resultsHiddenNote:
      "No counts, no leader board and no partial results exist anywhere in this app before you close voting.",
    viewResults: "View results",

    scheduleHeading: "Voting times",
    scheduleHelp:
      "Set when voting opens and when it closes. Leave either one empty to control it by hand instead. Times are in your own time zone.",
    scheduleOpens: "Voting opens",
    scheduleCloses: "Voting closes",
    scheduleSave: "Save these times",
    scheduleClear: "Remove the times",
    scheduleNone: "No times set. Voting is controlled by the buttons above.",
    scheduleBefore: (when: string) =>
      `Voting has not opened yet. It opens on ${when}.`,
    scheduleDuring: (when: string) => `Voting is open until ${when}.`,
    scheduleDuringNoEnd: "Voting is open, with no closing time set.",
    scheduleAfter: (when: string) => `Voting closed on ${when}.`,
    scheduleBackwards: "The closing time has to be after the opening time.",
    schedulePast: "That closing time has already passed.",

    practiceHeading: "Practice run size",
    practiceHelp:
      "A practice does not need the whole village. Choose how many made up people to put on the ballot and how many names each voter picks. The app invents the people and their codes for you.",
    practicePeople: "People on the practice ballot",
    practicePicks: "Names each voter must choose",
    practiceStart: "Set up the practice",
    practiceClear: "Back to the full size",
    practiceActive: (people: number, picks: number) =>
      `Practice size in use: ${people} people, choosing ${picks} names each.`,
    practiceFull: (people: number, picks: number) =>
      `Full size: ${people} people, choosing ${picks} names each.`,
    practiceNote:
      "This only applies while the app is in test mode. Switching to live puts it back to the real numbers.",

    rosterHeading: "Voter list",
    rosterModeNames: "I have names only. Make the Voter IDs for me",
    rosterModeIds: "I already have a Voter ID for each person",
    rosterNamesHelp:
      "Paste one name per line, all 130 of them. The system will make a private Voter ID for each person.",
    rosterHelp:
      "Paste one row per voter as: Voter ID, then a comma, then the name. A header row is allowed.",
    rosterRowCount: (found: number, expected: number) =>
      found === expected
        ? `${found} of ${expected} rows. Ready to load.`
        : `${found} of ${expected} rows.`,
    rosterDownloadSheet: "Download the Voter ID sheet",
    rosterSheetWarning:
      "Keep this sheet private. Give each person only their own Voter ID, one to one. If the IDs reach the group chat, anyone can vote as anyone.",
    rosterLoad: "Load this list",
    rosterCurrent: (n: number) => `${n} voters loaded`,
    rosterEmpty: "No voters loaded yet.",
    rosterDummy: "Load dummy voters for testing",
    rosterBlocked:
      "The voter list cannot be replaced while there are ballots in the ballot box.",

    modeHeading: "Mode",
    modeTest: "TEST",
    modeLive: "LIVE",
    resetForLive: "Reset everything and switch to live",
    resetForLiveHelp: (phrase: string) =>
      `This deletes every ballot, marks every voter as not voted, clears every flag and lock, and switches the app to live. Type ${phrase} to confirm.`,
    resetLiveOverrideHelp: (phrase: string) =>
      `This election is LIVE. Resetting will destroy real votes. If you are certain, also type ${phrase}.`,
    resetPhraseWrong: "The confirmation phrase does not match.",

    auditHeading: "Activity log",
    auditEmpty: "Nothing logged yet.",
  },

  results: {
    title: "Results",
    heading: (n: number) => `Top ${n}`,
    rank: "Rank",
    number: "No.",
    name: "Name",
    votes: "Votes",
    winner: "Winner",
    totalsHeading: "Check figures",
    totalBallots: (n: number) => `Ballots counted: ${n}`,
    totalVoters: (n: number) => `Voters on the register: ${n}`,
    totalMarkedVoted: (n: number) => `Voters marked as voted: ${n}`,
    totalVotesCast: (n: number) => `Individual votes counted: ${n}`,
    mismatchWarning:
      "The number of ballots does not match the number of voters marked as voted. This is expected if you allowed anyone to vote again after a problem.",
    tieHeading: "Tie at the boundary",
    tieWarning: (count: number, votes: number, place: number) =>
      `${count} people are tied on ${votes} votes at position ${place}. This tie has not been broken. Decide it by village rules.`,
    noTie: "There is no tie at the boundary.",
    exportCsv: "Download results as CSV",
    emptyBox: "No ballots were cast.",
  },
} as const;
