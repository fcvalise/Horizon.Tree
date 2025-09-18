import * as hz from 'horizon/core';
import * as ui from 'horizon/ui';

export const LogOnScreenEvent = new hz.NetworkEvent<{log: string}>("logOnScreen");

export class OScreenConsole extends ui.UIComponent<typeof OScreenConsole> {
  private opacity = new ui.AnimatedBinding(0);
  private log = new ui.Binding("Console On");
  private logHistory: string = "";

  public static logOnScreen(component: hz.Component, log: string) {
    component.sendNetworkBroadcastEvent(LogOnScreenEvent, {log: log});
  }

  start() {
    this.connectNetworkBroadcastEvent(LogOnScreenEvent, payload => {
    this.logHistory += '\n' + payload.log;
    const lines = this.logHistory.split('\n');
    const lastLines = lines.slice(-20);
    this.logHistory = lastLines.join('\n');
    this.log.set(this.logHistory);
    this.log.set(this.logHistory);
    });
  }

  initializeUI() {
    return ui.View({
      children: [
        ui.Text({
          text: this.log,
          style: {
            fontSize: 15,
            fontWeight: "500",
            color: "#5c4c45ff",
            textAlign: 'center',
            textAlignVertical: "bottom",
            position: "absolute",
            fontFamily: "Oswald",
            width: "100%",
            backgroundColor: `rgba(0, 0, 0, 1)`,
            padding: 5000,
            opacity: this.opacity
          },
        }),
        ui.Text({
          text: this.log,
          style: {
            color: 'white',
            fontSize: 16,
            whiteSpace: 'pre-wrap', // Optional, ensures line breaks work
          },
        }),
      ],
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: 16,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
      }
    });
  }
}

hz.Component.register(OScreenConsole);
