const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const MAX_LIMIT = 20

exports.main = async (event, context) => {
  const { type } = event
  const { OPENID } = cloud.getWXContext()

  switch (type) {
    case 'login':     return login(OPENID)
    case 'addLog':    return addLog(event, OPENID)
    case 'getLogs':   return getLogs(event, OPENID)
    case 'getLog':    return getLog(event)
    case 'updateLog': return updateLog(event)
    case 'deleteLog': return deleteLog(event)
    case 'getStats':  return getStats(OPENID)
    default:          return { success: false, error: 'Unknown type' }
  }
}

async function login(openid) {
  try {
    const users = db.collection('users')
    const { data } = await users.where({ _openid: openid }).limit(1).get()
    const now = new Date()
    if (data.length > 0) {
      await users.doc(data[0]._id).update({ data: { lastLoginAt: now } })
      return { success: true, data: { openid, lastLoginAt: now, createdAt: data[0].createdAt } }
    }
    await users.add({ data: { _openid: openid, createdAt: now, lastLoginAt: now } })
    return { success: true, data: { openid, lastLoginAt: now, createdAt: now } }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function addLog(event, openid) {
  const { data } = event
  const now = new Date()
  try {
    const result = await db.collection('coffee_logs').add({
      data: { ...data, _openid: openid, createdAt: now, updatedAt: now }
    })
    return { success: true, id: result._id }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function getLogs(event, openid) {
  const { skip = 0, page = 0, pageSize = 20 } = event
  const offset = skip || (page * pageSize)
  try {
    const result = await db.collection('coffee_logs')
      .where({ _openid: openid })
      .orderBy('createdAt', 'desc')
      .skip(offset)
      .limit(pageSize)
      .get()
    return { success: true, data: result.data }
  } catch (err) {
    return { success: false, data: [], error: err.message }
  }
}

async function getLog(event) {
  const { id } = event
  try {
    const result = await db.collection('coffee_logs').doc(id).get()
    return { success: true, data: result.data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function updateLog(event) {
  const { id, data } = event
  try {
    await db.collection('coffee_logs').doc(id).update({
      data: { ...data, updatedAt: new Date() }
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function deleteLog(event) {
  const { id } = event
  try {
    await db.collection('coffee_logs').doc(id).remove()
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function getStats(openid) {
  try {
    const allLogs = []
    let page = 0
    while (true) {
      const batch = await db.collection('coffee_logs')
        .where({ _openid: openid })
        .skip(page * MAX_LIMIT)
        .limit(MAX_LIMIT)
        .get()
      allLogs.push(...batch.data)
      if (batch.data.length < MAX_LIMIT) break
      page++
    }

    if (allLogs.length === 0) {
      return {
        success: true,
        data: {
          totalBrews: 0, avgOverall: 0,
          methodCounts: {},
          avgScores: { aroma: 0, acidity: 0, sweetness: 0, body: 0, aftertaste: 0, overall: 0 },
          recentLogs: [],
        }
      }
    }

    const totalBrews = allLogs.length
    const avgOverall = (allLogs.reduce((s, l) => s + (l.overall || 0), 0) / totalBrews).toFixed(1)

    const methodCounts = {}
    allLogs.forEach(l => { methodCounts[l.brewMethod] = (methodCounts[l.brewMethod] || 0) + 1 })

    const dims = ['aroma', 'acidity', 'sweetness', 'body', 'aftertaste', 'overall']
    const avgScores = {}
    dims.forEach(d => {
      avgScores[d] = +(allLogs.reduce((s, l) => s + (l[d] || 0), 0) / totalBrews).toFixed(1)
    })

    const recentLogs = allLogs
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)

    return { success: true, data: { totalBrews, avgOverall, methodCounts, avgScores, recentLogs } }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
