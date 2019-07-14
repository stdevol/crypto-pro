import 'cadesplugin'
/* globals cadesplugin */
import api from './signature-plugin.js'
import { partialRead } from './read-file.js'

export async function getDataSignature(thumbprint, dataToSign) {
  try {
    await cadesplugin
    return await api.getDataSignature(thumbprint, dataToSign)
  } catch (error) {
    console.error(error)
    throw error
  }
}

export async function getDataSignatureByHashes(thumbprint, multipleHash) {
  try {
    await cadesplugin
    return await api.getDataSignatureByHashes(thumbprint, multipleHash)
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

export async function makeHashes(dataToHash) {
  try {
    await cadesplugin
    return await api.makeHashes(dataToHash)
  } catch (error) {
    console.error(error)
    throw error
  }
}

export async function getSignatureByFile(thumbprint, file) {
  try {
    await cadesplugin
    const certificate = await api.getWrappedCertificate(thumbprint)
    const hashedData = await api.createHashedData(certificate.algorithm.value)
    await hashedData.propset_DataEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY)
    for (const partPromise of partialRead(file)) {
      const part = await partPromise
      await hashedData.Hash(part)
    }

    return await api.createDataSignatureByHash(certificate.origin, hashedData)
    
  } catch (error) {
    console.error(error)
    throw error
  }
}
