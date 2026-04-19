import { VideoRenderer, RenderParams, RenderResponse, ProgressParams, ProgressResponse, RenderTypeInfo } from "../types/renderer";

/**
 * HTTP-based video renderer implementation
 */
export class HttpRenderer implements VideoRenderer {
  private endpoint: string;
  private renderTypeInfo: RenderTypeInfo;

  constructor(endpoint: string, renderType: RenderTypeInfo) {
    this.endpoint = endpoint;
    this.renderTypeInfo = renderType;
  }

  async renderVideo(params: RenderParams): Promise<RenderResponse> {
    const response = await fetch(`${this.endpoint}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Render request failed: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    // Handle different response structures
    // Lambda renderer wraps response in { type: "success", data: ... }
    // SSR renderer returns response directly
    if (responseData.type === "success" && responseData.data) {
      return responseData.data;
    }
    
    // Direct response (SSR)
    return responseData;
  }

  async getProgress(params: ProgressParams): Promise<ProgressResponse> {
    const response = await fetch(`${this.endpoint}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      let message = `Progress request failed: ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (typeof errorData?.message === 'string') {
          message = errorData.message;
        } else if (typeof errorData?.error === 'string') {
          message = errorData.error;
        }
      } catch {
        // Keep fallback message when body is not JSON.
      }

      return { type: 'error', message };
    }

    const responseData = await response.json();
    
    // Handle different response structures
    // Lambda renderer wraps response in { type: "success", data: ... }
    // SSR renderer returns response directly
    if (responseData.type === "success" && responseData.data) {
      return responseData.data;
    }
    
    // Direct response (SSR)
    return responseData;
  }

  get renderType(): RenderTypeInfo {
    return this.renderTypeInfo;
  }
} 