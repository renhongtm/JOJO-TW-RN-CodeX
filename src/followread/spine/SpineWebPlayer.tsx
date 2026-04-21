import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  EmbeddedSpineAsset,
  followReadSpineAssets,
  localSpinePlayerScript,
  localSpinePlayerStyle,
} from './generated/followReadSpineAssets';

interface SpineWebPlayerProps {
  assetKey: 'challengeTarget' | 'vsShow';
  title: string;
  subtitle: string;
}

const escapedLocalSpinePlayerScript = localSpinePlayerScript.replace(
  /<\/script/gi,
  '<\\/script',
);

function buildPlayerHtml(asset: EmbeddedSpineAsset): string {
  const config = {
    skelUrl: asset.skeletonFileName,
    atlasUrl: asset.atlasFileName,
    rawDataURIs: {
      [asset.skeletonFileName]: asset.skeletonDataUri,
      [asset.atlasFileName]: asset.atlasDataUri,
      [asset.imageFileName]: asset.imageDataUri,
    },
    showControls: false,
    showLoading: false,
    interactive: false,
    alpha: true,
    backgroundColor: '#00000000',
    premultipliedAlpha: true,
  };

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      ${localSpinePlayerStyle}
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
      }
      #player {
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background: transparent;
      }
      .spine-player-controls {
        display: none !important;
      }
    </style>
  </head>
  <body>
    <div id="player"></div>
    <script>
      function post(payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function getSpineRuntime() {
        if (window.spine && window.spine.SpinePlayer) {
          return window.spine;
        }

        return null;
      }

      function createPlayer() {
        try {
          const spineRuntime = getSpineRuntime();
          if (!spineRuntime || !spineRuntime.SpinePlayer) {
            throw new Error('Spine Web Player script did not expose window.spine.SpinePlayer');
          }

          const config = ${JSON.stringify(config)};
          new spineRuntime.SpinePlayer('player', Object.assign({}, config, {
            success: function (player) {
              const animations = player && player.skeleton && player.skeleton.data
                ? player.skeleton.data.animations.map(function (animation) {
                    return animation.name;
                  })
                : [];

              post({
                type: 'success',
                assetKey: ${JSON.stringify(asset.key)},
                animations: animations,
              });
            },
            error: function (_player, reason) {
              post({
                type: 'error',
                assetKey: ${JSON.stringify(asset.key)},
                reason: String(reason || 'Unknown spine player error'),
              });
            },
          }));
        } catch (error) {
          post({
            type: 'error',
            assetKey: ${JSON.stringify(asset.key)},
            reason: String(error && error.message ? error.message : error),
          });
        }
      }

      window.addEventListener('load', function () {
        createPlayer();
      });
    </script>
    <script>
      ${escapedLocalSpinePlayerScript}
    </script>
  </body>
</html>`;
}

export function SpineWebPlayer({
  assetKey,
  title,
  subtitle,
}: SpineWebPlayerProps) {
  const [status, setStatus] = useState<string>('Loading...');

  const asset = useMemo(
    () => followReadSpineAssets.find(item => item.key === assetKey) ?? null,
    [assetKey],
  );

  const html = useMemo(() => (asset ? buildPlayerHtml(asset) : ''), [asset]);

  if (!asset) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.statusError}>Missing embedded Spine asset: {assetKey}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.playerShell}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webView}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          onMessage={event => {
            try {
              const payload = JSON.parse(event.nativeEvent.data);
              if (payload.type === 'success') {
                const animations = Array.isArray(payload.animations)
                  ? payload.animations.join(', ')
                  : '';
                setStatus(
                  animations
                    ? `Ready · animations: ${animations}`
                    : 'Ready · animation list unavailable',
                );
                return;
              }

              setStatus(`Error · ${payload.reason ?? 'Unknown error'}`);
            } catch (error) {
              setStatus(`Error · ${String(error)}`);
            }
          }}
        />
      </View>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  playerShell: {
    height: 220,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#dbeafe',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  status: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  statusError: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
});
