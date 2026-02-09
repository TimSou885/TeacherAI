import { AwsClient } from 'aws4fetch'

export type PollyOptions = {
  voiceId?: string
  engine?: 'standard' | 'neural'
  outputFormat?: 'mp3' | 'ogg_vorbis'
  sampleRate?: string
  /** 語速：slow ~80%, medium 100% */
  speed?: 'slow' | 'medium'
}

/**
 * 呼叫 Amazon Polly SynthesizeSpeech，回傳音頻 ArrayBuffer。
 * 需設定 AWS_ACCESS_KEY_ID、AWS_SECRET_ACCESS_KEY、AWS_REGION（可選，預設 ap-east-1）。
 */
export async function synthesizeWithPolly(
  text: string,
  options: PollyOptions,
  env: { AWS_ACCESS_KEY_ID: string; AWS_SECRET_ACCESS_KEY: string; AWS_REGION?: string }
): Promise<ArrayBuffer> {
  const region = env.AWS_REGION ?? 'ap-east-1'
  const pollyUrl = `https://polly.${region}.amazonaws.com/v1/speech`
  const aws = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  })
  const body = {
    Text: text,
    VoiceId: options.voiceId ?? 'Zhiyu',
    OutputFormat: options.outputFormat ?? 'mp3',
    Engine: options.engine ?? 'neural',
    SampleRate: options.sampleRate ?? '24000',
  }
  const res = await aws.fetch(pollyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Polly: ${res.status} ${err}`)
  }
  return res.arrayBuffer()
}
