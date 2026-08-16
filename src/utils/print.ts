type PrintCallback = (context?: { doc: Document }) => void;

interface PrintOptions {
  styleStr?: string;
  setDomHeightArr?: string[];
  printBeforeFn?: PrintCallback | null;
  printDoneCallBack?: PrintCallback | null;
}

interface PrintConfig {
  styleStr: string;
  setDomHeightArr: string[];
  printBeforeFn: PrintCallback | null;
  printDoneCallBack: PrintCallback | null;
}

interface ComponentWithElement {
  $el: Element;
}

type PrintTarget = string | Element | ComponentWithElement;

class Printer {
  private readonly conf: PrintConfig;
  private readonly dom: Element;

  constructor(dom: PrintTarget, options: PrintOptions = {}) {
    this.conf = {
      styleStr: options.styleStr ?? "",
      setDomHeightArr: options.setDomHeightArr ?? [],
      printBeforeFn: options.printBeforeFn ?? null,
      printDoneCallBack: options.printDoneCallBack ?? null
    };

    const target =
      typeof dom === "string"
        ? document.querySelector(dom)
        : this.isDOM(dom)
          ? dom
          : dom.$el;
    if (!target) {
      throw new Error("Print target element not found");
    }
    this.dom = target;

    if (this.conf.setDomHeightArr.length) {
      this.setDomHeight(this.conf.setDomHeightArr);
    }
    this.init();
  }

  /**
   * init
   */
  private init(): void {
    const content = this.getStyle() + this.getHtml();
    this.writeIframe(content);
  }

  /**
   * Configuration property extension
   * @param {Object} obj
   * @param {Object} obj2
   */
  extendOptions<T extends object>(obj: T, obj2: Partial<T>): T {
    for (const k in obj2) {
      if (Object.prototype.hasOwnProperty.call(obj2, k)) {
        const value = obj2[k];
        if (value !== undefined) obj[k] = value;
      }
    }
    return obj;
  }

  /**
    Copy all styles of the original page
  */
  getStyle(): string {
    let str = "";
    const styles: NodeListOf<Element> = document.querySelectorAll("style,link");
    for (let i = 0; i < styles.length; i++) {
      str += styles[i].outerHTML;
    }
    str += `<style>.no-print{display:none;}${this.conf.styleStr}</style>`;
    return str;
  }

  // form assignment
  getHtml(): string {
    const inputs = document.querySelectorAll("input");
    const selects = document.querySelectorAll("select");
    const textareas = document.querySelectorAll("textarea");
    const canvass = document.querySelectorAll("canvas");

    for (let k = 0; k < inputs.length; k++) {
      if (inputs[k].type == "checkbox" || inputs[k].type == "radio") {
        if (inputs[k].checked == true) {
          inputs[k].setAttribute("checked", "checked");
        } else {
          inputs[k].removeAttribute("checked");
        }
      } else if (inputs[k].type == "text") {
        inputs[k].setAttribute("value", inputs[k].value);
      } else {
        inputs[k].setAttribute("value", inputs[k].value);
      }
    }

    for (let k2 = 0; k2 < textareas.length; k2++) {
      if (textareas[k2].type == "textarea") {
        textareas[k2].innerHTML = textareas[k2].value;
      }
    }

    for (let k3 = 0; k3 < selects.length; k3++) {
      if (selects[k3].type == "select-one") {
        const children = Array.from(selects[k3].children);
        for (const child of children) {
          if (child instanceof HTMLOptionElement) {
            if (child.selected) {
              child.setAttribute("selected", "selected");
            } else {
              child.removeAttribute("selected");
            }
          }
        }
      }
    }

    for (let k4 = 0; k4 < canvass.length; k4++) {
      const imageURL = canvass[k4].toDataURL("image/png");
      const img = document.createElement("img");
      img.src = imageURL;
      img.setAttribute("style", "max-width: 100%;");
      img.className = "isNeedRemove";
      canvass[k4].parentNode?.insertBefore(img, canvass[k4].nextElementSibling);
    }

    return this.dom.outerHTML;
  }

  /**
    create iframe
  */
  private writeIframe(content: string): void {
    const iframe: HTMLIFrameElement = document.createElement("iframe");
    const f: HTMLIFrameElement = document.body.appendChild(iframe);
    iframe.id = "myIframe";
    iframe.setAttribute(
      "style",
      "position:absolute;width:0;height:0;top:-10px;left:-10px;"
    );

    const frameWindow = f.contentWindow;
    const doc = f.contentDocument;
    if (!frameWindow || !doc) {
      document.body.removeChild(iframe);
      throw new Error("Unable to initialize print iframe");
    }
    doc.open();
    doc.write(content);
    doc.close();

    const removes = document.querySelectorAll(".isNeedRemove");
    for (let k = 0; k < removes.length; k++) {
      removes[k].parentNode?.removeChild(removes[k]);
    }

    iframe.onload = (): void => {
      // Before popping, callback
      if (this.conf.printBeforeFn) {
        this.conf.printBeforeFn({ doc });
      }
      this.toPrint(frameWindow);
      setTimeout(() => {
        document.body.removeChild(iframe);
        // After popup, callback
        if (this.conf.printDoneCallBack) {
          this.conf.printDoneCallBack();
        }
      }, 100);
    };
  }

  /**
    Print
  */
  toPrint(frameWindow: Window): void {
    try {
      setTimeout(() => {
        frameWindow.focus();
        try {
          if (!frameWindow.document.execCommand("print", false, undefined)) {
            frameWindow.print();
          }
        } catch {
          frameWindow.print();
        }
        frameWindow.close();
      }, 10);
    } catch (err) {
      console.error(err);
    }
  }

  private isDOM(obj: Element | ComponentWithElement): obj is Element {
    if (typeof HTMLElement === "object") {
      return obj instanceof HTMLElement;
    }
    return (
      typeof obj === "object" &&
      "nodeType" in obj &&
      obj.nodeType === 1 &&
      "nodeName" in obj &&
      typeof obj.nodeName === "string"
    );
  }

  /**
   * Set the height of the specified dom element by getting the existing height of the dom element and setting
   * @param {Array} arr
   */
  setDomHeight(arr: string[]): void {
    if (arr.length) {
      arr.forEach(name => {
        const domArr = document.querySelectorAll<HTMLElement>(name);
        domArr.forEach(element => {
          element.style.height = element.offsetHeight + "px";
        });
      });
    }
  }
}

/**
 * 保留原有可直接调用的 API；运行时使用类实现消除动态 this 与类型绕过。
 */
function Print(dom: PrintTarget, options?: PrintOptions): Printer {
  return new Printer(dom, options);
}

export default Print;
