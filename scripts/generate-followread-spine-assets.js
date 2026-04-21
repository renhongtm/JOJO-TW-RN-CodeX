const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.resolve(
  '/Volumes/RhExtremeSSD/JOJO/git/jojo-tw-unity_iOS/Assets/TemplateRes/GameResources/MainTemplate/u3d_prefab_followread_word_backups/Spine',
);
const outputPath = path.join(
  projectRoot,
  'src/followread/spine/generated/followReadSpineAssets.ts',
);
const playerScriptPath = path.join(
  projectRoot,
  'vendor/spine-3.8/spine-player.js',
);
const playerStylePath = path.join(
  projectRoot,
  'vendor/spine-3.8/player/css/spine-player.css',
);

const assetFolders = [
  {
    key: 'challengeTarget',
    folder: 'ChallengeTarget',
    atlas: 'ChallengeTarget.atlas.txt',
    skeleton: 'ChallengeTarget.skel.bytes',
    image: 'ChallengeTarget.png',
  },
  {
    key: 'vsShow',
    folder: 'vs_show',
    atlas: 'vs_show.atlas.txt',
    skeleton: 'vs_show.skel.bytes',
    image: 'vs_show.png',
  },
];

function readBase64(filePath) {
  return fs.readFileSync(filePath).toString('base64');
}

function buildAsset(folderConfig) {
  const baseDir = path.join(sourceRoot, folderConfig.folder);

  return {
    key: folderConfig.key,
    atlasFileName: folderConfig.atlas,
    skeletonFileName: folderConfig.skeleton,
    imageFileName: folderConfig.image,
    atlasDataUri: `data:application/octet-stream;base64,${readBase64(
      path.join(baseDir, folderConfig.atlas),
    )}`,
    skeletonDataUri: `data:application/octet-stream;base64,${readBase64(
      path.join(baseDir, folderConfig.skeleton),
    )}`,
    imageDataUri: `data:image/png;base64,${readBase64(
      path.join(baseDir, folderConfig.image),
    )}`,
  };
}

const assets = assetFolders.map(buildAsset);
const playerScript = fs.readFileSync(playerScriptPath, 'utf8');
const playerStyle = fs.readFileSync(playerStylePath, 'utf8');

const output = `export interface EmbeddedSpineAsset {
  key: string;
  atlasFileName: string;
  skeletonFileName: string;
  imageFileName: string;
  atlasDataUri: string;
  skeletonDataUri: string;
  imageDataUri: string;
}

export const followReadSpineAssets: EmbeddedSpineAsset[] = ${JSON.stringify(
  assets,
)};

export const localSpinePlayerScript = ${JSON.stringify(playerScript)};

export const localSpinePlayerStyle = ${JSON.stringify(playerStyle)};
`;

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, output);
console.log(`Generated ${outputPath}`);
