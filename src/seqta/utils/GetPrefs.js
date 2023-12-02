const GetPrefs = await fetch(`${location.origin}/seqta/student/load/prefs?`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asArray: true, request: 'userPrefs' })
  })
  export const response = await GetPrefs.json()