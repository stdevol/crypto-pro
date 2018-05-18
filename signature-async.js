import 'cadesplugin'
/* globals cadesplugin */
import range from 'lodash/range'

let certificates = undefined

function getCertificateByThumbprint(thumbprint, certificates) {
  const findedCert = certificates.filter(cer => cer.thumb === thumbprint)
  if (!findedCert[0]) return null
  return findedCert[0].cert
}

function extractString(from, what, to) {
  let result = ''
  const begin = from.indexOf(what)

  if (begin >= 0) {
    const end = from.indexOf(to, begin)
    result = end < 0 ? from.substr(begin) : from.substr(begin, end - begin)
  }
  return result
}

async function getCertificatesFromStorage() {
  const cadesplugin = window.cadesplugin
  await cadesplugin
  const storage = await cadesplugin.CreateObjectAsync('CAPICOM.store')
  try {
    await storage.Open(cadesplugin.CAPICOM_CURRENT_USER_STORE, 'My', cadesplugin.CAPICOM_DIGITAL_SIGNATURE_KEY_USAGE)
    const certs = await storage.Certificates
    const promises = range(await certs.Count).map(index => readCertificate(certs, index + 1))
    const allCerts = await Promise.all(promises)
    return (certificates = allCerts.filter(x => x.isValid && x.hasPrivateKey))
  } catch (error) {
    console.error(error)
    throw error
  } finally {
    await storage.Close()
  }
}

// xml sign
async function getSignedXml(thumbprint, dataToSign) {
  try {
    const certificate = getCertificateByThumbprint(thumbprint, certificates)
    return await createXmlSignature(certificate, dataToSign)
  } catch (error) {
    console.error(error)
    throw error
  }
}

async function createXmlSignature(certificate, dataToSign) {
  const signer = await cadesplugin.CreateObjectAsync('CAdESCOM.CPSigner')
  await signer.propset_Certificate(certificate)
  const signedXml = await cadesplugin.CreateObjectAsync('CAdESCOM.SignedXML')
  await signedXml.propset_Content(dataToSign)
  await signedXml.propset_SignatureType(cadesplugin.CADESCOM_XML_SIGNATURE_TYPE_ENVELOPED)
  await signedXml.propset_SignatureMethod(cadesplugin.XmlDsigGost3410Url)
  await signedXml.propset_DigestMethod(cadesplugin.XmlDsigGost3411Url)
  return await signedXml.Sign(signer)
}

async function verifyXmlSignature(signedData) {
  const signedXml = await cadesplugin.CreateObjectAsync('CAdESCOM.SignedXML')
  return await signedXml.Verify(signedData)
}

async function readCertificate(certificates, index) {
  const wrapper = await certificates.Item(index)
  return {
    subject: extractString(await wrapper.SubjectName, 'CN=', ', '),
    issuer: extractString(await wrapper.IssuerName, 'CN=', ', '),
    validTo: await wrapper.ValidToDate,
    serial: await wrapper.SerialNumber,
    hasPrivateKey: await wrapper.HasPrivateKey(),
    isValid: await (await wrapper.IsValid()).Result,
    thumb: await wrapper.Thumbprint,
    cert: wrapper,
  }
}

// data(hash) sign
async function getDataSignature(thumbprint, dataToSign) {
  try {
    const certificate = getCertificateByThumbprint(thumbprint, certificates)
    const hash = await makeHash(dataToSign)
    return await createDataSignatureByHash(certificate, hash)
  } catch (error) {
    console.error(error)
    throw error
  }
}

async function getDataSignatureByHash(thumbprint, hashValue) {
  try {
    const certificate = getCertificateByThumbprint(thumbprint, certificates)
    const hash = await initHash(hashValue)
    return await createDataSignatureByHash(certificate, hash)
  } catch (error) {
    console.error(error)
    throw error
  }
}

async function makeHash(dataToHash) {
  const hashedData = await cadesplugin.CreateObjectAsync('CAdESCOM.HashedData')
  await hashedData.propset_Algorithm(cadesplugin.CADESCOM_HASH_ALGORITHM_CP_GOST_3411)
  await hashedData.propset_DataEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY)
  await hashedData.Hash(dataToHash)
  return hashedData
}

async function initHash(hashValue) {
  const hashedData = await cadesplugin.CreateObjectAsync('CAdESCOM.HashedData')
  await hashedData.propset_Algorithm(cadesplugin.CADESCOM_HASH_ALGORITHM_CP_GOST_3411)
  await hashedData.SetHashValue(hashValue)
  return hashedData
}

async function createDataSignatureByHash(certificate, hash) {
  const signer = await cadesplugin.CreateObjectAsync('CAdESCOM.CPSigner')
  await signer.propset_Certificate(certificate)
  const cadesSignedData = await cadesplugin.CreateObjectAsync('CAdESCOM.CadesSignedData')
  const sign = await cadesSignedData.SignHash(hash, signer, cadesplugin.CADESCOM_CADES_BES)

  //WARNING!!! sign returned by crypto pro are formatted lines of bese64 strings, splitted by \r\n - it does not required and does not change result
  return sign.replace(/\r\n/g, '')
}

async function verifyDataSignature(sign, dataToVerify) {
  const hash = await makeHash(dataToVerify)
  const signedData = await cadesplugin.CreateObjectAsync('CAdESCOM.CadesSignedData')
  try {
    await signedData.VerifyHash(hash, sign, cadesplugin.CADESCOM_CADES_BES)
  } catch (error) {
    console.error(error)
    throw error
  }
}

export default { getCertificatesFromStorage, getSignedXml, verifyXmlSignature, getDataSignature, getDataSignatureByHash, verifyDataSignature, makeHash }
