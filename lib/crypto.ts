import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
function key(){const raw=process.env.APP_ENCRYPTION_KEY;if(!raw)throw new Error('APP_ENCRYPTION_KEY is required');return createHash('sha256').update(raw).digest();}
export function encrypt(value:string){const iv=randomBytes(12);const c=createCipheriv('aes-256-gcm',key(),iv);const encrypted=Buffer.concat([c.update(value,'utf8'),c.final()]);return `${iv.toString('base64url')}.${c.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;}
export function decrypt(value:string){const parts=value.split('.');if(parts.length!==3)throw new Error('Invalid encrypted value format');const [iv,tag,data]=parts;const d=createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64url'));d.setAuthTag(Buffer.from(tag,'base64url'));return Buffer.concat([d.update(Buffer.from(data,'base64url')),d.final()]).toString('utf8');}


// Aliases used by 2FA module
export const encryptSecret = encrypt;
export const decryptSecret = decrypt;