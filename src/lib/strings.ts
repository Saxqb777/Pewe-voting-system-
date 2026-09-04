/**
 * Every piece of text a voter or an admin can see lives in this one file.
 * To translate the app into another language, copy this object, translate the
 * values and export the copy instead. No other file needs to change.
 *
 * House rule for this project: no dashes of any kind in user facing text.
 */

export const strings = {
  common: {
    orgName: "Pewe Social Welfare Society",
    registration: "Registration No. F/3584/RTG and MH/5602/RTG",
    appName: "PSWS General Election for Pewe 2026",
    contactLead: "For any questions, please contact",
    contactName: "Nisar PSWS",
    contactPhone: "+974 5588 4597",
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
      "If it keeps happening, please contact Nisar PSWS on +974 5588 4597.",
    notFoundTitle: "Page not found",
    notFoundLead: "Please use the link that was shared in the group.",
    slowConnectionHint: "If nothing happens, wait a moment and try once more.",
  },

  /**
   * A word from the society, shown on the screen where a voter enters their
   * code. Written by the society, kept exactly as they wrote it.
   */
  note: {
    quote: "Qiyadat ek Amanah hai aur vote ek Gawahi (Shahadat) hai.",
    body: "PSWS ke 17 members ko chunte waqt hum sabhi ko chahiye ke poori hikmat, imandari aur soch-samajh kar apna vote dein. Allah Ta'ala se dua hai ke wo har voter ko sahi faisla lene ki hidayat ata farmaye. Jin 17 numaindon ko chuna jaye, wo aur unhe chunne wale tamaam afrad aapas mein kandhe se kandha mila kar, ek dil hokar Pewe ki falah-o-behbood aur taraqqi ke liye khuloos ke sath kaam karein.",
    amen: "Aameen.",
  },

  /**
   * Registration. The one screen where a mistake sticks: the name typed here
   * is the name every voter reads on the ballot. The two instructions that
   * matter carry a Hindi line as well, the same way the guide does.
   */
  register: {
    title: "Register to vote",
    lead: "Put in your full name, your phone number and the country you are living in. Your voting code appears on this screen straight away.",
    leadHi: "Apna poora naam, phone number aur jis mulk mein aap rehte hain woh likhiye. Aapka voting code isi screen par turant aa jayega.",
    nameLabel: "Your full name",
    namePlaceholder: "Your full name",
    nameHelp: "Every voter will see this name on the ballot, so please write it in full and properly.",
    nameHelpHi: "Yahi naam sabhi voters ko ballot par dikhega, isliye poora aur sahi likhiye.",
    phoneLabel: "Your phone number",
    phonePlaceholder: "Your WhatsApp number",
    phoneHelp: "Use the same number the society has for you.",
    countryLabel: "Where are you living now?",
    countryPlaceholder: "Choose a country",
    countryCommon: "Most common",
    countryOther: "Everywhere else",
    countryHelp:
      "Asked once, here. The society counts how many are voting from each country, and it is never attached to your choices.",
    countryHelpHi:
      "Yeh sirf ek baar poocha jayega, yahin. Society sirf ginti karti hai ki kis mulk se kitne log vote de rahe hain. Aapke vote se iska koi taalluq nahi.",
    badCountry: "Please choose the country you are living in.",
    submit: "Register",
    working: "Please wait",
    badName: "Please write your full name.",
    badNumber: "That does not look like a phone number. Please check it and try again.",
    already:
      "This number has already registered. If you have lost your code, please contact the election admin.",
    closed: "Registration has closed. The list of voters is now fixed.",
    tooMany: "Too many registrations from this connection. Please try again in a little while.",

    doneTitle: "You are registered",
    codeLabel: "Your voting code",
    codeWarning:
      "Take a screenshot or write this down now. It is shown once only and cannot be shown again.",
    codeWarningHi:
      "Abhi screenshot le lijiye ya likh lijiye. Yeh sirf ek baar dikhta hai, dobara nahi dikhega.",
    // What happens next, in the order it will happen to them. Without this a
    // man who has just registered has no idea whether anything else is
    // expected of him, so he opens the link again to check and finds the
    // form waiting, which reads as though his registration did not take.
    doneThanks: "Thank you for registering.",
    doneKeep: "Keep your code safe with you. You will need it to vote.",
    doneKeepHi: "Apna code sambhaal kar rakhiye. Vote dene ke liye yahi chahiye hoga.",
    doneNext:
      "There is nothing more to do for now. Once everyone has registered you will be told. Voting opens on its own, and you come back to this same link and put your code in.",
    doneNextHi:
      "Abhi aur kuch nahi karna hai. Jab sab log register kar lenge to aapko bata diya jayega. Voting apne aap shuru ho jayegi, phir isi link par wapas aakar apna code daaliye.",

    pendingTitle: "Sent to the admin",
    pendingLead:
      "Your number is not on the society's list, so the election admin has to approve you first. You will be told once that is done.",

    // Shown when the link is opened again on the phone that registered.
    backTitle: "You are already registered",
    backLead: (name: string) => `You registered as ${name}.`,
    backLost:
      "Your code is not shown again. If you have lost it, please contact the election admin below.",
    backLostHi:
      "Code dobara nahi dikhaya jayega. Agar kho gaya hai to neeche diye gaye election admin se sampark kijiye.",
    backPendingTitle: "You are waiting to be approved",
    backApprovedTitle: "You have been approved",
    backApprovedLead:
      "The election admin has put you on the voter list. Here is your voting code.",
    backApprovedLeadHi:
      "Election admin ne aapko voter list mein daal diya hai. Yeh raha aapka voting code.",
    // Not the registration warning. That one says the code is shown once and
    // never again, which is not true here: this screen holds it until he says
    // he has it, and the line under it explains that.
    backApprovedWarn: "Take a screenshot or write this down now.",
    backApprovedWarnHi: "Abhi screenshot le lijiye ya likh lijiye.",
    backApprovedSaved: "I have saved my code",
    backApprovedSavedHi: "Maine apna code save kar liya",
    backApprovedKeep:
      "This screen keeps your code until you press the button below. After that it is not shown again.",
    backApprovedKeepHi:
      "Neeche wala button dabane tak yeh screen aapka code dikhati rahegi. Uske baad dobara nahi dikhega.",
  },

  // -----------------------------------------------------------------------
  // The page anybody may open. Pinned in the group so nobody has to ask.
  // -----------------------------------------------------------------------
  chase: {
    title: "Still to vote",
    titleHi: "Jinhone abhi tak vote nahi diya",
    stillToVote: "still to vote",
    stillToVoteHi: "abhi baaki hain",
    ofRoster: (voted: number, total: number) => `${voted} of ${total} have voted`,
    help: "Tap any number to call. This page counts itself again every 30 seconds, so a name goes as soon as that person votes.",
    helpHi:
      "Kisi bhi number par tap karke call kijiye. Yeh page har 30 second mein khud update hota hai, jaise hi koi vote deta hai uska naam hat jata hai.",
    everybodyVoted: "Everybody has voted. Nothing left to do.",
    everybodyVotedHi: "Sabhi ne vote de diya. Ab kuch karna baaki nahi.",
    updated: (when: string) => `Last checked ${when}`,
    privacy:
      "This page is for the people making the calls. It carries no voting codes, and nothing at all about how anybody voted.",
    privacyHi:
      "Yeh page sirf call karne walon ke liye hai. Is par koi voting code nahi hai, aur kisi ke vote ke baare mein kuch bhi nahi.",
  },

  status: {
    title: "Who has registered",
    titleHi: "Kaun kaun register ho chuka hai",
    lead: "This page updates on its own. Open it any time.",
    leadHi: "Yeh page apne aap update hota hai. Kabhi bhi khol kar dekh sakte hain.",
    // The day read as a run chase, because that is the language the village
    // already argues in.
    scoreHeading: "The chase",
    scoreHeadingHi: "Chase ka haal",
    scoreTarget: "Target",
    scoreTargetHi: "Target",
    scoreScore: "Score",
    scoreScoreHi: "Score",
    scoreOvers: (n: number) => `in ${n} ${n === 1 ? "hour" : "hours"}`,
    scoreOversHi: (n: number) => `${n} ${n === 1 ? "ghante" : "ghanton"} mein`,
    scoreRequired: "Required rate",
    scoreRequiredHi: "Kitna chahiye",
    scoreCurrent: "Current rate",
    scoreCurrentHi: "Abhi kitna chal raha hai",
    scoreStrike: "Strike rate",
    scoreStrikeHi: "Required se aage",
    scorePerHour: (n: number) => `${n} an hour`,
    scorePerHourHi: (n: number) => `${n} har ghante`,
    scoreOnPar: "100 is on par",
    scoreOnParHi: "100 matlab barabar",

    scoreStillOut: "Still to vote",
    scoreStillOutHi: "Abhi baaki",
    // Deliberately not an announcement that there is no deadline. A man who
    // reads that he has all the time in the world takes it.
    scoreOpenNote: "Please vote now",
    scoreOpenNoteHi: "Abhi vote kijiye",
    scoreLeft: (n: number) => `${n} ${n === 1 ? "hour" : "hours"} left`,
    scoreLeftHi: (n: number) => `${n} ${n === 1 ? "ghanta" : "ghante"} baaki`,
    verdictCruising: "Cruising. Sixes all over the ground.",
    verdictCruisingHi: "Aaram se ja rahe hain. Chauke chhakke lag rahe hain.",
    verdictOnTop: "On top of the chase.",
    verdictOnTopHi: "Chase par pakad hai.",
    verdictTight: "Tight game. Keep the strike rotating.",
    verdictTightHi: "Match kaanta hai. Strike rotate karte rahiye.",
    verdictSlipping: "Slipping behind. Time for a big over.",
    verdictSlippingHi: "Peeche ja rahe hain. Ab ek bada over chahiye.",
    verdictBehind: "Well behind. Start ringing people.",
    verdictBehindHi: "Kaafi peeche hain. Logon ko call karna shuru kijiye.",
    verdictChased: "Target chased. Everybody has voted.",
    verdictChasedHi: "Target pura. Sabhi ne vote de diya.",
    closesIn: "Voting closes in",
    closesNote: "After this nobody can vote.",
    closesNoteHi: "Iske baad koi vote nahi de sakta.",
    votingPace: (need: number, left: string, rate: string, coming: string) =>
      `${need} more to vote in ${left}. That is ${rate}, and ${coming} are voting.`,
    votingPaceHi: (need: number, left: string, rate: string, coming: string) =>
      `${left} mein ${need} aur vote dene hain. Yaani ${rate}, aur abhi ${coming} vote de rahe hain.`,
    votingPaceDone: "Everybody on the voter list has voted.",
    votingPaceDoneHi: "Voter list ke sabhi log vote de chuke hain.",
    perHour: (n: number) => `${n} an hour`,
    perHourHi: (n: number) => `${n} har ghante`,
    votingTitle: "Voting is under way",
    votingTitleHi: "Voting chal rahi hai",
    rosterHeading: (n: number) => `The ${n} on the voter list`,
    rosterHeadingHi: "Voter list ke log",
    votedNow: "Voted as of now",
    votedNowHi: "Ab tak vote de chuke",
    ofRoster: (have: number, n: number) => `${have} of ${n} on the voter list`,
    ofRosterHi: (have: number, n: number) => `${n} voters mein se ${have}`,
    stillToVote: (n: number) => `${n} still to vote`,
    stillToVoteHi: (n: number) => `${n} logon ne abhi vote nahi diya`,
    everybodyVoted: "Everybody on the voter list has voted.",
    everybodyVotedHi: "Voter list ke sabhi log vote de chuke hain.",
    liveNote: "This page counts itself again every 30 seconds.",
    liveNoteHi: "Yeh page har 30 second mein khud ginti kar leta hai.",
    noResultsYet: "No result is shown here, and nothing about how anybody voted.",
    noResultsYetHi:
      "Yahan koi result nahi dikhaya jata, aur kisi ke vote ke baare mein kuch bhi nahi.",
    registeredNow: "Registered as of now",
    registeredNowHi: "Abhi tak register ho chuke",
    ofExpected: (have: number, n: number) => `${have} of about ${n} expected`,
    ofExpectedHi: (have: number, n: number) => `takreeban ${n} mein se ${have}`,
    stillToCome: (n: number) => `${n} still to register`,
    stillToComeHi: (n: number) => `${n} logon ne abhi register nahi kiya`,
    everybodyIn: "Everybody on the society's list has registered.",
    everybodyInHi: "Society ki list ke sabhi log register kar chuke hain.",
    registrationOpen: "Registration is open",
    registrationOpenHi: "Registration khula hai",
    registrationClosed: "Registration has closed. The voter list is fixed.",
    registrationClosedHi: "Registration band ho chuka hai. Voter list pakki ho chuki hai.",
    votingNow: "Voting is open now.",
    votingNowHi: "Voting abhi khuli hai.",
    votingDone: "Voting has closed.",
    votingDoneHi: "Voting band ho chuki hai.",
    notYet: "Nobody has registered yet.",
    notYetHi: "Abhi kisi ne register nahi kiya.",
    listHeading: (n: number) => `The ${n} who have registered`,
    listHeadingHi: "Jo log register ho chuke hain",
    colName: "Name",
    colJoined: "Registered",
    joinIn: "Not on the list yet? Register here",
    joinInHi: "Aapne abhi tak register nahi kiya? Yahan kijiye",
    statsHeading: "The full figures",
    statsHeadingHi: "Poore aankde",
    statsAgainst: (n: number) =>
      `Every share below is worked out against the ${n} people the society expects to take part.`,
    statsAgainstHi: (n: number) =>
      `Neeche ke sabhi percentage un ${n} logon ke muqable nikale gaye hain jinke aane ki ummeed hai.`,
    statsAgainstVoting: (n: number) =>
      `Every share below is worked out against the ${n} people on the voter list.`,
    statsAgainstVotingHi: (n: number) =>
      `Neeche ke sabhi percentage voter list ke un ${n} logon ke muqable nikale gaye hain.`,
    statsOf: (percent: number, outOf: string) => `${percent}% of ${outOf}`,
    updated: (when: string) => `Last checked ${when}`,
    privacy: "No voting codes are on this page, and nothing at all about how anybody voted.",
    privacyHi: "Is page par koi voting code nahi hai, aur kisi ke vote ke baare mein kuch bhi nahi.",
  },

  entry: {
    title: "PSWS General Election for Pewe 2026",
    subtitle: "Enter your Voter ID to begin",
    label: "Voter ID",
    countryLabel: "Where are you voting from?",
    countryPlaceholder: "Choose a country",
    countryCommon: "Most common",
    countryOther: "Everywhere else",
    countryHelp:
      "This is counted by country only. It is never attached to your choices.",
    placeholder: "Your Voter ID",
    submit: "Continue",
    checking: "Checking",
    // One generic message for every failure, so nobody can use this screen to
    // find out which IDs exist or which people have already voted.
    generic: "That Voter ID cannot be used. Please check it and try again.",
    locked:
      "Too many attempts from this phone. Please contact Nisar PSWS on +974 5588 4597.",
    closed: "Voting is closed. Thank you.",
    notReady: "Voting has not opened yet. Please try again later.",
    opensAt: (when: string) => `Voting opens on ${when}. Please come back then.`,
    help: "Your Voter ID was sent to you by the society. It is only yours.",
    closesAt: (when: string) => `Voting closes on ${when}`,
    // The day read as a run chase, because that is the language the village
    // already argues in.
    scoreHeading: "The chase",
    scoreHeadingHi: "Chase ka haal",
    scoreTarget: "Target",
    scoreTargetHi: "Target",
    scoreScore: "Score",
    scoreScoreHi: "Score",
    scoreOvers: (n: number) => `in ${n} ${n === 1 ? "hour" : "hours"}`,
    scoreOversHi: (n: number) => `${n} ${n === 1 ? "ghante" : "ghanton"} mein`,
    scoreRequired: "Required rate",
    scoreRequiredHi: "Kitna chahiye",
    scoreCurrent: "Current rate",
    scoreCurrentHi: "Abhi kitna chal raha hai",
    scoreStrike: "Strike rate",
    scoreStrikeHi: "Required se aage",
    scorePerHour: (n: number) => `${n} an hour`,
    scorePerHourHi: (n: number) => `${n} har ghante`,
    scoreOnPar: "100 is on par",
    scoreOnParHi: "100 matlab barabar",

    scoreStillOut: "Still to vote",
    scoreStillOutHi: "Abhi baaki",
    // Deliberately not an announcement that there is no deadline. A man who
    // reads that he has all the time in the world takes it.
    scoreOpenNote: "Please vote now",
    scoreOpenNoteHi: "Abhi vote kijiye",
    scoreLeft: (n: number) => `${n} ${n === 1 ? "hour" : "hours"} left`,
    scoreLeftHi: (n: number) => `${n} ${n === 1 ? "ghanta" : "ghante"} baaki`,
    verdictCruising: "Cruising. Sixes all over the ground.",
    verdictCruisingHi: "Aaram se ja rahe hain. Chauke chhakke lag rahe hain.",
    verdictOnTop: "On top of the chase.",
    verdictOnTopHi: "Chase par pakad hai.",
    verdictTight: "Tight game. Keep the strike rotating.",
    verdictTightHi: "Match kaanta hai. Strike rotate karte rahiye.",
    verdictSlipping: "Slipping behind. Time for a big over.",
    verdictSlippingHi: "Peeche ja rahe hain. Ab ek bada over chahiye.",
    verdictBehind: "Well behind. Start ringing people.",
    verdictBehindHi: "Kaafi peeche hain. Logon ko call karna shuru kijiye.",
    verdictChased: "Target chased. Everybody has voted.",
    verdictChasedHi: "Target pura. Sabhi ne vote de diya.",
    closesIn: "Voting closes in",
    opensIn: "Voting opens in",
    closingSoon: "Voting closes very soon. Please finish now.",
    ballotClosesIn: "Time left to vote:",
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
    thisIsYou: "This is you",
    thisIsYouHi: "Yeh aap hain",
    noSelfVote: "You cannot vote for yourself. Take your own name off and choose another.",
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

    flowHeading: "Election steps",
    regNoNameOnFile: "No name on file",
    stepsHeading: "Where you are",
    step1: "Load the numbers allowed to register",
    step1Done: (n: number) => `${n} numbers can register`,
    regAllowedNamed: (named: number, total: number) =>
      named === 0
        ? "None of them carry a name, so the lists you send out will show the number on its own. Paste the list again with the name in front of each number to fix that."
        : named < total
          ? `${named} of them carry a name. The rest will show the number on its own.`
          : "Every one of them carries a name.",
    step1Todo: "Paste the society's phone numbers in, one per line.",
    step2: "Open registration",
    step2Done: "Registration is open",
    step2Todo: "Until you open it, nobody can put their name in.",
    step3: "People register themselves",
    step3Done: (n: number) => `${n} people registered`,
    // Said with each number's own base against it. The two are counted
    // differently on purpose, because a man may register from a number the
    // society never had, and without saying so they read as a sum that is
    // wrong.
    step3Waiting: (done: number, left: number) =>
      left > 0
        ? `${done} people registered. ${left} on the society's list still to come.`
        : `${done} people registered. Everybody on the society's list has been in.`,
    step3Todo: "Each person puts their own name and number in and gets their code.",
    step4: "Confirm the voter list",
    step4Done: (n: number) => `Fixed at ${n} voters`,
    step4Todo:
      "Closes registration for good. Press it when enough people are in, or leave it: the voting hour does the same thing on its own.",
    step5: "Voting opens",
    step5Done: "Voting has started",
    step5Auto: (when: string) =>
      `Opens on its own on ${when}, whether or not you press step 4 first. Nothing to do.`,

    step5Button: "Start voting now",
    step5Confirm:
      "Start voting now, before the set time? Voters will be able to vote immediately.",
    step6: "Voting closes",
    step6Done: "Voting is closed",
    step6Auto: (when: string) => `Closes on its own on ${when}. Nothing to do.`,
    closeAnywayConfirm:
      "Close anyway and take their votes away? This cannot be undone once the result is read.",
    closeStopped: "Left open. Nobody has lost their vote.",
    step6Waiting: (n: number) =>
      n === 1
        ? "Closes itself when the last person votes. 1 still to go."
        : `Closes itself when the last person votes. ${n} still to go.`,
    removeClosing: "Let it run until I close it",
    removeClosingHelp:
      "Takes the closing time off. Voting then stays open until you press Close voting yourself.",
    removeClosingConfirm:
      "Remove the closing time? Voting will stay open until you close it by hand.",
    step6Open: "Open until you close it. No closing time is set.",
    step6Todo: "Once voting has started.",
    step7: "Read the results",
    step7Todo: "Available once voting has closed.",
    stepOptional: "optional",

    statusNotStarted: "Voting has not started",
    statusNotStartedHelp:
      "Nobody can vote yet. Work through the steps below and press Start voting when you are ready.",
    statusOpen: "Voting is open",
    statusFinished: "Voting has finished",
    statusOpensIn: "Opens in",
    statusClosesIn: "Closes in",
    statusOpensAt: (when: string) => `Opens ${when}`,
    statusClosesAt: (when: string) => `Closes ${when}`,
    statusClosedAt: (when: string) => `Closed ${when}`,
    statusNoEnd: "No closing time set. Close it by hand when you are ready.",
    statusNoSchedule: "No times set. Voting is open until you close it.",
    statusWaiting: "Nobody can vote yet. The link shows them when to come back.",

    turnoutHeading: "Turnout",
    turnout: (voted: number, total: number) =>
      `${voted} of ${total} voted`,
    ballotsInBox: (n: number) => `${n} ballots in the ballot box`,
    autoRefresh: "This number updates on its own every 10 seconds.",

    pendingHeading: "Not voted yet",
    pendingEmpty: "Everyone has voted.",
    copyPending: "Copy this list",
    copied: "Copied",

    countriesHeading: "Where people voted from",
    countriesEmpty: "Nobody has voted yet.",
    countriesNote:
      "Counted from the register, which already knows who has voted. It is never stored with anybody's choices.",
    countriesUnknown: "Not said",

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
    scheduleNeedOne: "Fill in at least one of the two boxes above to save.",
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

    // ---------------------------------------------------------------
    // Registration. People put their own names in, and the admin watches
    // them arrive and then fixes the list for good.
    // ---------------------------------------------------------------
    regHeading: "Registration",
    regNotStarted:
      "People are not registering yet. Load the list of numbers allowed to register, then open it.",
    regAllowedLabel: "Numbers allowed to register",
    regAllowedHelp:
      "One per line. Put the name in front of the number, with a comma or a tab or just a space between them, and that name is what shows on the lists you send out. Anyone whose number is not here can still register, but you have to approve them.",
    regAllowedLoad: "Save this list",
    regAllowedReplace: (n: number) =>
      `Saving replaces all ${n} numbers currently on the list. Anyone who has already registered stays registered.`,
    regAllowedCount: (n: number) => `${n} numbers can register.`,
    regOpenHeading: "Open registration",
    regOpenWarning: (phrase: string) =>
      `This clears the current voter list and lets people put their own names in. Type ${phrase} to confirm.`,
    regOpenButton: "Open registration",
    regOpenPlaceholder: "OPEN REGISTRATION",

    // Starting over. A trial run leaves real names on the register, and
    // without this the only way back was a reset that cleared the ballots but
    // left every one of those names sitting there.
    regRestartHeading: "Start registration again",
    regRestartWarning: (n: number, phrase: string) =>
      n === 0
        ? `This clears the register and starts registration fresh. Type ${phrase} to confirm.`
        : `This removes all ${n} ${n === 1 ? "person" : "people"} registered so far, including their codes, and starts registration fresh. The list of allowed numbers is kept. Type ${phrase} to confirm.`,
    regRestartButton: "Clear everyone and start again",

    regLiveCount: (n: number) =>
      `${n} ${n === 1 ? "person has" : "people have"} registered.`,
    regWaitingHeading: (n: number) => `Waiting for you to approve (${n})`,
    regWaitingHelp:
      "These numbers are not on the list you loaded. Approve anyone you recognise and reject the rest.",
    regApprove: "Approve",
    regReject: "Reject",
    regRegisteredHeading: (n: number) => `On the roster (${n})`,
    regRegisteredHelp:
      "Their code is shown here so you can read it back to anyone who loses theirs.",
    regShowCode: "Show code again",
    regShowingCode: "Waiting for them to open the link",
    regRemove: "Remove",
    regRemoveConfirm: (name: string) =>
      `Remove ${name} from the register? Their code stops working and they will have to register again from the start.`,
    regRowHelp:
      "Show code again puts it back on that person's own phone the next time they open the link. Remove takes them off the register so they can register afresh.",
    regMissingHeading: (n: number) => `Not registered yet (${n})`,
    regMissingHelp: "Chase these numbers before you confirm.",
    regNobodyMissing: "Everybody on the list has registered.",

    regConfirmHeading: "Fix the list and set the dates",
    regConfirmHelp: (opens: string, closes: string) =>
      `Confirming closes registration for good, numbers the candidates in name order, and sets voting to open on ${opens} and close on ${closes}. The times can still be changed afterwards.`,
    regConfirmButton: "Confirm the voter list",
    regConfirmTooFew: (have: number, seats: number) =>
      `Only ${have} ${have === 1 ? "person has" : "people have"} registered so far. Each voter has to choose ${seats} names, so at least ${seats + 1} people must register before the list can be fixed.`,
    regConfirmBlocked:
      "Confirming is not possible once there are ballots in the ballot box.",
    regLocked: (n: number) =>
      `The voter list is fixed at ${n} people. Registration cannot be reopened without clearing the election.`,

    rosterHeading: "Voter list",
    rosterModeNames: "I have names only. Make the Voter IDs for me",
    rosterModeIds: "I already have a Voter ID for each person",
    rosterNamesHelp: (expected: number) =>
      `Paste one name per line, all ${expected} of them. The system will make a private Voter ID for each person.`,
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

    restartHeading: "Start over",
    restartHelp:
      "Clears every vote and puts the election back to not started, keeping your voter list and everyone's codes. Use it to run the practice again.",
    restartButton: "Clear the votes and start over",
    restartConfirm:
      "This deletes every vote cast so far and puts the election back to not started. Your voter list and everyone's codes are kept. Continue?",
    restartLiveWarning: (phrase: string) =>
      `This election is LIVE. Starting over will destroy real votes. Type ${phrase} to confirm.`,
    restartDone: "Votes cleared. The election is back to not started.",

    modeHeading: "Mode",
    modeTest: "TEST",
    modeLive: "LIVE",
    resetForLive: "Reset everything and switch to live",
    resetForLiveHelp: (phrase: string) =>
      `This deletes every ballot, marks every voter as not voted, clears every flag and lock, and switches the app to live. Type ${phrase} to confirm.`,
    resetLiveOverrideHelp: (phrase: string) =>
      `This election is LIVE. Resetting will destroy real votes. If you are certain, also type ${phrase}.`,
    resetPhraseWrong: "The confirmation phrase does not match.",

    // ---------------------------------------------------------------
    // The report. Counts and shares, never a name or a number.
    // ---------------------------------------------------------------
    reportHeading: "Report",
    reportTaken: (when: string) => `As it stands on ${when}`,
    reportStage: "Stage",
    reportExpected: (n: number) =>
      `Shares are worked out against the ${n} people the society expects to take part.`,
    reportTarget: "Against the target",
    reportTargetBy: (when: string) => `Target by ${when}`,
    reportSoFar: "Registered so far",
    reportStillNeeded: "Still needed",
    reportNeededPerDay: "Needed per day",
    reportNeededPerHour: "Needed per hour",
    reportComingPerDay: "Coming in per day so far",
    reportComingPerHour: "Coming in per hour so far",
    // Read like a required run rate: what is left, over the balls remaining,
    // set against what is actually being scored.
    reportPaceNeeded: (need: number, left: string, rate: string, coming: string) =>
      `${need} more needed in ${left}. That is ${rate}, and ${coming} are coming in.`,
    reportPaceReached: (have: number, expected: number) =>
      `Target reached. ${have} registered against the ${expected} expected.`,
    reportPaceOver: (have: number, expected: number) =>
      `The window has closed with ${have} of the ${expected} expected.`,
    reportRate: (n: number, per: "day" | "hour") => `${n} a ${per}`,
    reportRegistration: "Registration",
    reportVoting: "Voting",
    reportCountries: "Where they are",
    reportOutOf: (what: string) => `of ${what}`,
    reportDownload: "Download in English",
    reportDownloadHi: "Hinglish mein download kijiye",
    reportDownloadCsv: "or as a spreadsheet",

    // The same report in the language the village actually speaks, so it can
    // be read out in a meeting without anybody translating on the spot.
    hi: {
      heading: "Report",
      taken: (when: string) => `${when} tak ki halat`,
      stage: "Stage",
      expected: (n: number) =>
        `Sabhi percentage un ${n} logon ke muqable nikale gaye hain jinke aane ki ummeed hai.`,
      target: "Target ke muqable",
      targetBy: (when: string) => `${when} tak ka target`,
      soFar: "Ab tak kitne register hue",
      stillNeeded: "Aur kitne chahiye",
      neededPerDay: "Har din kitne chahiye",
      neededPerHour: "Har ghante kitne chahiye",
      comingPerDay: "Abhi har din kitne aa rahe hain",
      comingPerHour: "Abhi har ghante kitne aa rahe hain",
      paceNeeded: (need: number, left: string, rate: string, coming: string) =>
        `${left} mein ${need} aur chahiye. Yaani ${rate}, aur abhi ${coming} aa rahe hain.`,
      paceReached: (have: number, expected: number) =>
        `Target pura ho gaya. ${expected} ki ummeed thi, ${have} register ho chuke.`,
      paceOver: (have: number, expected: number) =>
        `Waqt khatam ho chuka hai. ${expected} mein se ${have} log aaye.`,
      rate: (n: number, per: "din" | "ghanta") =>
        per === "din" ? `${n} har din` : `${n} har ghante`,
      registration: "Registration",
      voting: "Voting",
      countries: "Log kahan hain",
      outOf: (what: string) => `${what} mein se`,
      privacy:
        "Is report mein sirf ginti hai. Koi naam, koi number, koi code nahi, aur kisi ke vote ke baare mein kuch bhi nahi.",
      stages: {
        registering: "Registration khula hai",
        confirmed: "Voter list confirm ho chuki hai, voting shuru hone ka intezaar",
        voting: "Voting khuli hai",
        closed: "Voting band ho chuki hai",
        idle: "Abhi shuru nahi hua",
      },
      lines: {
        expectedToTakePart: "Kitne logon ke aane ki ummeed hai",
        allowed: "Kitne number register kar sakte hain",
        onRoster: "Register ho chuke aur list mein hain",
        waiting: "Approval ka intezaar",
        stillOut: "Aapki list mein hain, abhi register nahi kiya",
        offList: "Aise number se register kiya jo aapki list mein nahi",
        rosterTotal: "List mein kitne hain",
        voted: "Vote de chuke",
        notVoted: "Abhi vote nahi diya",
        ballots: "Ballot box mein kitne vote hain",
        noCountry: "Nahi bataya",
      },
      outOfBases: {
        expected: "ummeed",
        allowed: "allowed numbers",
        roster: "list",
        everybody: "sab registered log",
      },
    },
    reportPrivacy:
      "This report holds counts only. No name, no number, no code, and nothing at all about how anybody voted.",

    // The list of who has registered, made to be sent to the group.
    namesHeading: "Registered voters",
    namesHeadingHi: "Jo log register ho chuke hain",
    namesCount: (n: number) => `${n} registered so far`,
    namesTaken: (when: string) => `As it stands on ${when}`,
    namesTapToCall: "Tap any number to call it.",
    namesColName: "NAME",
    namesColPhone: "PHONE",
    namesColJoined: "REGISTERED",
    namesPrivacy:
      "No voting codes are on this page, and nothing about how anybody voted.",
    namesPrivacyHi:
      "Is page par koi voting code nahi hai, aur kisi ke vote ke baare mein kuch bhi nahi.",
    statusLinkHeading: "The page the group can watch",
    statusLinkHelp:
      "Send this link once and let them pin it. It shows who has registered and updates on its own, so nobody has to ask you for a file again. Names and numbers, and no codes.",
    statusLinkOpen: "Open it",
    linkCopy: "Copy the link",
    linkCopied: "Copied",
    chaseLinkHeading: "The link for whoever is making the calls",
    chaseLinkHelp:
      "Everybody still to vote, with their number, updating on its own. Send it to the few people doing the ringing, not to the group.",
    chaseLinkOpen: "Open it",
    chaseLinkWarning:
      "Anybody holding this address can see the list, so keep it off the group. It carries no voting codes.",
    missingHeading: "Not yet registered",
    missingHeadingHi: "Jinhone abhi tak register nahi kiya",
    missingCount: (n: number) => `${n} still to register`,
    missingPrivacy:
      "Everybody here is on the society's list and has not registered yet. Please call them.",
    missingPrivacyHi:
      "Yeh sab log society ki list mein hain aur inhone abhi tak register nahi kiya. Inhe call kijiye.",
    namesNoName: "No name on file",
    bothHeading: "Registered and still to register",
    bothHeadingHi: "Kaun register ho chuke aur kaun baaki hain",
    bothCount: (done: number, left: number) =>
      `${done} registered, ${left} still to register`,
    bothCheck:
      "Find your own name below. If it is on the first list you are done and nobody needs to call you.",
    bothCheckHi:
      "Neeche apna naam dhoondhiye. Agar pehli list mein hai to aapka kaam ho gaya, koi aapko call nahi karega.",
    bothDone: (n: number) => `Already registered (${n})`,
    bothDoneHi: "Yeh log register ho chuke hain",
    bothLeft: (n: number) => `Still to register (${n})`,
    bothLeftHi: "Yeh log abhi baaki hain",
    bothPrivacy:
      "A man with two numbers on the society's list counts as registered on both. No voting codes are on this page.",
    bothPrivacyHi:
      "Jinke do number list mein hain, unke dono number register maane gaye hain. Is page par koi voting code nahi hai.",
    bothDownload: "Download both lists to share",
    bothDownloadHelp:
      "Registered and still to register in one file, so a man can find his own name and see he is done. Safe to send in the group.",
    notVotedHeading: "Still to vote",
    notVotedHeadingHi: "Jinhone abhi tak vote nahi diya",
    notVotedCount: (n: number) => `${n} still to vote`,
    notVotedPrivacy:
      "Everybody here is on the voter list and has not voted yet. Please call them. No voting codes are on this page.",
    notVotedPrivacyHi:
      "Yeh sab log voter list mein hain aur inhone abhi tak vote nahi diya. Inhe call kijiye. Is page par koi code nahi hai.",
    notVotedDownload: "Download who has not voted",
    notVotedDownloadHelp:
      "Names and numbers of everyone still holding a code, so you know who to ring. For you, not for the group, and no codes on it.",
    missingDownload: "Download who has not registered",
    missingDownloadHelp:
      "The numbers on your list that have not come in yet, so you know who to call. For you, not for the group.",
    namesDownload: "Download the list of names to share",
    namesDownloadHelp:
      "Safe to send in the group. Names, numbers and when each person registered, with no codes on it.",

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
