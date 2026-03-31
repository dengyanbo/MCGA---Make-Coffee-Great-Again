const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const MAX_LIMIT = 20

exports.main = async (event, context) => {
  const { type } = event
  const { OPENID } = cloud.getWXContext()

  switch (type) {
    case 'login':              return login(OPENID)
    case 'updateNickname':     return updateNickname(event, OPENID)
    case 'addLog':             return addLog(event, OPENID)
    case 'getLogs':            return getLogs(event, OPENID)
    case 'getLog':             return getLog(event)
    case 'updateLog':          return updateLog(event)
    case 'deleteLog':          return deleteLog(event)
    case 'getStats':           return getStats(OPENID)
    case 'saveEquipment':      return saveEquipment(event, OPENID)
    case 'getEquipment':       return getEquipment(OPENID)
    case 'completeOnboarding': return completeOnboarding(OPENID)
    case 'getBrewRecipe':      return getBrewRecipe(event)
    case 'getFilteredLogs':    return getFilteredLogs(event, OPENID)
    default:                   return { success: false, error: 'Unknown type' }
  }
}

async function login(openid) {
  try {
    const users = db.collection('users')
    const { data } = await users.where({ _openid: openid }).limit(1).get()
    const now = new Date()
    if (data.length > 0) {
      await users.doc(data[0]._id).update({ data: { lastLoginAt: now } })
      return {
        success: true,
        data: {
          openid,
          lastLoginAt: now,
          createdAt: data[0].createdAt,
          nickname: data[0].nickname || '',
          onboardingDone: data[0].onboardingDone || false,
        }
      }
    }
    await users.add({ data: { _openid: openid, createdAt: now, lastLoginAt: now, nickname: '', onboardingDone: false } })
    return { success: true, data: { openid, lastLoginAt: now, createdAt: now, nickname: '', onboardingDone: false } }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function updateNickname(event, openid) {
  const { nickname } = event
  try {
    const users = db.collection('users')
    const { data } = await users.where({ _openid: openid }).limit(1).get()
    if (data.length > 0) {
      await users.doc(data[0]._id).update({ data: { nickname: nickname || '' } })
    }
    return { success: true }
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

    const totalBrews = allLogs.length
    if (totalBrews === 0) {
      return {
        success: true,
        data: {
          totalBrews: 0,
          goodCount: 0,
          badCount: 0,
          goodRate: '0%',
          topBadReasons: [],
          methodCounts: {},
        }
      }
    }

    const goodCount = allLogs.filter(l => l.taste === 'good').length
    const badCount = allLogs.filter(l => l.taste === 'bad').length
    const goodRate = Math.round((goodCount / totalBrews) * 100) + '%'

    // Tally bad reasons across all logs
    const reasonCounts = {}
    allLogs.forEach(l => {
      if (Array.isArray(l.badReasons)) {
        l.badReasons.forEach(r => { reasonCounts[r] = (reasonCounts[r] || 0) + 1 })
      }
    })
    const topBadReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([reason]) => reason)

    const methodCounts = {}
    allLogs.forEach(l => {
      if (l.brewMethod) {
        methodCounts[l.brewMethod] = (methodCounts[l.brewMethod] || 0) + 1
      }
    })

    return {
      success: true,
      data: { totalBrews, goodCount, badCount, goodRate, topBadReasons, methodCounts }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function saveEquipment(event, openid) {
  const { grinders, filterCups } = event
  try {
    const users = db.collection('users')
    const { data } = await users.where({ _openid: openid }).limit(1).get()
    if (data.length > 0) {
      await users.doc(data[0]._id).update({
        data: {
          grinders: grinders || [],
          filterCups: filterCups || [],
        }
      })
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function getEquipment(openid) {
  try {
    const { data } = await db.collection('users').where({ _openid: openid }).limit(1).get()
    if (data.length > 0) {
      return {
        success: true,
        data: {
          grinders: data[0].grinders || [],
          filterCups: data[0].filterCups || [],
        }
      }
    }
    return { success: true, data: { grinders: [], filterCups: [] } }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function completeOnboarding(openid) {
  try {
    const users = db.collection('users')
    const { data } = await users.where({ _openid: openid }).limit(1).get()
    if (data.length > 0) {
      await users.doc(data[0]._id).update({ data: { onboardingDone: true } })
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function getBrewRecipe(event) {
  const { technique } = event
  try {
    const { data } = await db.collection('brew_recipes')
      .where({ technique })
      .limit(1)
      .get()
    if (data.length === 0) {
      return { success: false, error: '未找到该冲煮手法的配方' }
    }
    return { success: true, data: data[0] }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function getFilteredLogs(event, openid) {
  const { filters = {}, skip = 0, pageSize = 20 } = event
  try {
    const query = { _openid: openid }
    if (filters.beanName) {
      query.beanName = db.RegExp({ regexp: filters.beanName, options: 'i' })
    }
    if (filters.grinderModel) query.grinderModel = filters.grinderModel
    if (filters.grindSize) query.grindSize = filters.grindSize
    if (filters.waterTemp) query.waterTemp = filters.waterTemp
    if (filters.taste) query.taste = filters.taste

    const result = await db.collection('coffee_logs')
      .where(query)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    return { success: true, data: result.data }
  } catch (err) {
    return { success: false, data: [], error: err.message }
  }
}
