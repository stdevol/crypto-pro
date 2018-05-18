import 'cadesplugin'
/* globals cadesplugin */
import api from './signature-async.js'

export async function getSignedXml(thumbprint, dataToSign) {
  try {
    await cadesplugin
    return await api.getSignedXml(thumbprint, dataToSign)
  } catch (error) {
    console.error(error)
    throw error
  }
}

export async function getDataSignature(thumbprint, dataToSign) {
  try {
    await cadesplugin
    return await api.getDataSignature(thumbprint, dataToSign)
  } catch (error) {
    console.error(error)
    throw error
  }
}

export async function getDataSignatureByHash(thumbprint, hash) {
  try {
    await cadesplugin
    return await api.getDataSignatureByHash(thumbprint, hash)
  } catch (error) {
    console.error(error)
    throw error
  }
}

export async function verifyXmlSignature(signedData) {
  try {
    await cadesplugin
    return await api.verifyXmlSignature(signedData)
  } catch (error) {
    console.error(error)
    throw error
  }
}

export async function verifyDataSignature(sign, dataToVerify) {
  try {
    await cadesplugin
    await api.verifyDataSignature(sign, dataToVerify)
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export async function getCertificatesFromStorage() {
  return await api.getCertificatesFromStorage()
}

export async function checkCadesPlugin() {
  try {
    await cadesplugin
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export async function makeHash(dataToHash) {
  try {
    await cadesplugin
    const res = await api.makeHash(dataToHash)
    return res.Value
  } catch (error) {
    console.error(error)
    return null
  }
}
