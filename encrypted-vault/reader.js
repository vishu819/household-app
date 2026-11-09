'use strict';
kdbxweb.CryptoEngine.setArgon2Impl(async(password,salt,memory,iterations,length,parallelism,type,version)=>{
 if(version!==0x13)throw new Error('PREVIEW_UNSUPPORTED');
 if(memory>65536||iterations>20||parallelism>4||length>64||memory<8||iterations<1||parallelism<1)throw new Error('PREVIEW_LIMIT');
 const fn=type===0?hashwasm.argon2d:type===2?hashwasm.argon2id:null;if(!fn)throw new Error('PREVIEW_UNSUPPORTED');
 const result=await fn({password:new Uint8Array(password),salt:new Uint8Array(salt),memorySize:memory,iterations,parallelism,hashLength:length,outputType:'binary'});return result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength);
});
function checkHeader(bytes){const header=kdbxweb.KdbxHeader.read(new kdbxweb.BinaryStream(bytes),{});if(header.versionMajor===3&&header.keyEncryptionRounds>1_000_000)throw new Error('PREVIEW_LIMIT');
 const rounds=header.kdfParameters?.get('R');if(rounds&&Number(rounds.value??rounds)>1_000_000)throw new Error('PREVIEW_LIMIT');return header;
}

window.KeePassReader={checkHeader};
