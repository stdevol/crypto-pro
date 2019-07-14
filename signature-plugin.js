import 'cadesplugin'
/* globals cadesplugin */

let certificates = undefined

const algorithms = {
  v2001: {
    oid: '1.2.643.2.2.19',
    value: cadesplugin.CADESCOM_HASH_ALGORITHM_CP_GOST_3411,
    desc: 'Алгоритм ГОСТ Р 34.10-2001',
  },
  v2012: {
    oid: '1.2.643.7.1.1.1.1',
    value: cadesplugin.CADESCOM_HASH_ALGORITHM_CP_GOST_3411_2012_256,
    desc: 'Алгоритм ГОСТ Р 34.10-2012 для ключей длины 256 бит',
  },
  v2012Strong: {
    oid: '1.2.643.7.1.1.1.2',
    value: cadesplugin.CADESCOM_HASH_ALGORITHM_CP_GOST_3411_2012_512,
    desc: 'Алгоритм ГОСТ Р 34.10-2012 для ключей длины 512 бит',
  },
}

async function makeHash(dataToHash, algorithm) {
  if (!algorithm) {
    throw 'Не указан алгоритм'
  }
  const hashedData = await createHashedData(algorithm.value)
  await hashedData.propset_DataEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY)
  await hashedData.Hash(dataToHash)
  return hashedData
}

function fromPairs(pairs) {
  const result = {}
  for (var pair of pairs) {
    result[pair[0]] = pair[1]
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

  function range(count) {
    return Array.from(Array(count).keys())
  }
}

async function readCertificate(certificates, index) {
  const wrapper = await certificates.Item(index)

  return {
    subject: extractCN(await wrapper.SubjectName),
    issuer: extractCN(await wrapper.IssuerName),
    validTo: await wrapper.ValidToDate,
    serial: await wrapper.SerialNumber,
    hasPrivateKey: await wrapper.HasPrivateKey(),
    isValid: await (await wrapper.IsValid()).Result,
    thumb: await wrapper.Thumbprint,
    algorithmOid: await (await (await wrapper.PublicKey()).Algorithm).Value,
    origin: wrapper,
  }

  function extractCN(source) {
    return parseSignature(source)['CN']
  }

  function parseSignature(signature) {
    return fromPairs([...partsGenerator(signature)])
  }

  function* partsGenerator(signature) {
    const regex = /([^\s]+)=(("(""|[^"])*")|([^,|+]*))/gu
    let match
    while ((match = regex.exec(signature)) != null) {
      let value = match[2]
      if (value[0] == '"') {
        value = value.substring(1, value.length - 1).replace(/""/g, '"')
      }
      yield [match[1], value]
    }
  }
}

async function getDataSignature(thumbprint, dataToSign) {
  try {
    const certificate = await getWrappedCertificate(thumbprint)
    const hash = await makeHash(dataToSign, certificate.algorithm)
    return await createDataSignatureByHash(certificate.origin, hash)
  } catch (error) {
    console.error(error)
    throw error
  }
}

async function getWrappedCertificate(thumbprint) {
  try {
    await cadesplugin
    const certificate = certificates.find(cer => cer.thumb === thumbprint)
    return {
      origin: certificate.origin,
      algorithm: Object.values(algorithms).find(x => x.oid == certificate.algorithmOid),
    }
  } catch (error) {
    console.error(error)
    throw error
  }
}

async function getDataSignatureByHashes(thumbprint, multipleHash) {
  try {
    const certificate = certificates.find(cer => cer.thumb === thumbprint)
    const algorithm = Object.entries(algorithms).find(([, value]) => value.oid == certificate.algorithmOid)

    const key = algorithm[0].toString()
    const hash = multipleHash[key]
    if (!hash) {
      throw `Для одного из вложений не расчитан гост-хэш '${key}'`
    }
    const hashedData = await initHash(multipleHash[key], algorithm[1])

    return await createDataSignatureByHash(certificate.origin, hashedData)
  } catch (error) {
    console.error(error)
    throw error
  }

  async function initHash(hashValue, algorithm) {
    if (!algorithm) {
      throw 'Не указан алгоритм'
    }
    const hashedData = await createHashedData(algorithm.value)
    await hashedData.SetHashValue(hashValue)
    return hashedData
  }
}

async function makeHashes(base64Data) {
  try {
    const result = {}

    const aboutCsp = await cadesplugin.CreateObjectAsync('CAdESCOM.About')
    const version = await aboutCsp.CSPVersion('', 75)
    const majorVersion = await version.MajorVersion

    if (+majorVersion < 4) {
      const hashWrapper = await makeHash(base64Data, algorithms.v2001)
      result['v2001'] = await hashWrapper.Value
      return result
    }

    for (const algorithm of Object.keys(algorithms)) {
      const key = algorithm.toString()
      const hashWrapper = await makeHash(base64Data, algorithms[key])
      result[key] = await hashWrapper.Value
    }
    return result
  } catch (error) {
    console.error(error)
    throw error
  }
}

async function createHashedData(hashAlgorithm) {
  try {
    const hashedData = await cadesplugin.CreateObjectAsync('CAdESCOM.HashedData')
    await hashedData.propset_Algorithm(hashAlgorithm)
    return hashedData
  } catch (error) {
    console.error(error)
    throw error
  }
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
  try {
    const signedData = await cadesplugin.CreateObjectAsync('CAdESCOM.CadesSignedData')
    signedData.propset_ContentEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY)
    signedData.propset_Content(dataToVerify)

    await signedData.VerifyCades(sign, cadesplugin.CADESCOM_CADES_BES, true)
  } catch (error) {
    console.error(error)
    throw error
  }
}

export default {
  getCertificatesFromStorage,
  getDataSignature,
  getDataSignatureByHashes,
  verifyDataSignature,
  makeHashes,

  getWrappedCertificate,
  createHashedData,
  createDataSignatureByHash,
}
