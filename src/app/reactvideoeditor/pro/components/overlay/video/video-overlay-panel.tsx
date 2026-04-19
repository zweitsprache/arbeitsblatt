import { useState, useEffect, useCallback, useMemo } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useAspectRatio } from "../../../hooks/use-aspect-ratio";
import { ClipOverlay, Overlay, OverlayType } from "../../../types";
import { VideoDetails } from "./video-details";
import { useMediaAdaptors } from "../../../contexts/media-adaptor-context";
import { StandardVideo } from "../../../types/media-adaptors";
import { MediaOverlayPanel } from "../shared/media-overlay-panel";
import { getSrcDuration } from "../../../hooks/use-src-duration";
import { calculateIntelligentAssetSize, getAssetDimensions } from "../../../utils/asset-sizing";
import { useVideoReplacement } from "../../../hooks/use-video-replacement";
import { useLocalMedia } from "../../../contexts/local-media-context";

/**
 * VideoOverlayPanel is a component that provides video search and management functionality.
 * It allows users to:
 * - Search and browse videos from all configured video adaptors
 * - Add videos to the timeline as overlays
 * - Manage video properties when a video overlay is selected
 *
 * The component has two main states:
 * 1. Search/Browse mode: Shows a search input and grid of video thumbnails from all sources
 * 2. Edit mode: Shows video details panel when a video overlay is selected
 *
 * @component
 * @example
 * ```tsx
 * <VideoOverlayPanel />
 * ```
 */
export const VideoOverlayPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [videos, setVideos] = useState<
    Array<StandardVideo & { _source: string; _sourceDisplayName: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDurationLoading, setIsDurationLoading] = useState(false);
  const [loadingItemKey, setLoadingItemKey] = useState<string | null>(null);
  const [sourceResults, setSourceResults] = useState<
    Array<{
      adaptorName: string;
      adaptorDisplayName: string;
      itemCount: number;
      totalCount: number;
      hasMore: boolean;
      error?: string;
    }>
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const { searchVideos, videoAdaptors } = useMediaAdaptors();
  const { localMediaFiles } = useLocalMedia();
  const { isReplaceMode, startReplaceMode, cancelReplaceMode, replaceVideo } = useVideoReplacement();

  const {
    overlays,
    selectedOverlayId,
    changeOverlay,
    currentFrame,
    setOverlays,
    setSelectedOverlayId,
  } = useEditorContext();

  const { addAtPlayhead } = useTimelinePositioning();
  const { getAspectRatioDimensions } = useAspectRatio();
  const [localOverlay, setLocalOverlay] = useState<Overlay | null>(null);

  useEffect(() => {
    if (selectedOverlayId === null) {
      setLocalOverlay(null);
      return;
    }

    const selectedOverlay = overlays.find(
      (overlay) => overlay.id === selectedOverlayId
    );

    if (selectedOverlay?.type === OverlayType.VIDEO) {
      setLocalOverlay(selectedOverlay);
    }
  }, [selectedOverlayId, overlays]);

  const PAGE_SIZE = 20;

  const mappedLocalVideos = useMemo(
    () =>
      localMediaFiles
        .filter((file) => {
          const lowerType = (file.type || "").toLowerCase();
          if (lowerType === "video" || lowerType.startsWith("video/")) return true;
          return /\.(mp4|webm|mov|m4v|avi|mkv|ogv)$/i.test((file.name || "").toLowerCase());
        })
        .map((file) => ({
          id: file.id,
          type: "video" as const,
          width: 1920,
          height: 1080,
          thumbnail: file.thumbnail || file.path,
          duration: file.duration,
          videoFiles: [
            {
              quality: "hd" as const,
              format: "video/mp4",
              url: file.path,
            },
          ],
          _source: "uploads",
          _sourceDisplayName: "Uploads",
          _isLocalMedia: true,
          _localSrc: file.path,
        })) as Array<
          StandardVideo & {
            _source: string;
            _sourceDisplayName: string;
            _isLocalMedia?: boolean;
            _localSrc?: string;
          }
        >,
    [localMediaFiles]
  );

  useEffect(() => {
    if (!searchQuery.trim()) {
      setVideos(mappedLocalVideos);
      setSourceResults([
        {
          adaptorName: 'uploads',
          adaptorDisplayName: 'Uploads',
          itemCount: mappedLocalVideos.length,
          totalCount: mappedLocalVideos.length,
          hasMore: false,
        },
      ]);
      setTotalCount(mappedLocalVideos.length);
      setCurrentPage(1);
    }
  }, [mappedLocalVideos, searchQuery]);

  const loadPage = useCallback(async (query: string, page: number) => {
    if (!query.trim()) {
      setVideos(mappedLocalVideos);
      setSourceResults([
        {
          adaptorName: 'uploads',
          adaptorDisplayName: 'Uploads',
          itemCount: mappedLocalVideos.length,
          totalCount: mappedLocalVideos.length,
          hasMore: false,
        },
      ]);
      setTotalCount(mappedLocalVideos.length);
      return;
    }

    setIsLoading(true);
    try {
      const result = await searchVideos({
        query,
        perPage: PAGE_SIZE,
        page,
      });

      setVideos(result.items);
      setSourceResults(result.sourceResults);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error searching videos:", error);
      setVideos([]);
      setSourceResults([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [mappedLocalVideos, searchVideos]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadPage(searchQuery, 1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadPage(searchQuery, page);
  };

  const handleAddClip = async (
    video: StandardVideo & { _source: string; _sourceDisplayName: string }
  ) => {
    const itemKey = getItemKey(video);
    setIsDurationLoading(true);
    setLoadingItemKey(itemKey);

    try {
      // Check if we're in replace mode
      if (isReplaceMode && localOverlay) {
        // Replace mode: Use the hook to handle replacement
        await replaceVideo(
          localOverlay,
          video,
          (v) => {
            const adaptor = videoAdaptors.find((a) => a.name === v._source);
            return adaptor?.getVideoUrl(v, "hd") || "";
          },
          (updatedOverlay) => {
            setLocalOverlay(updatedOverlay);
            // Clear search state
            setSearchQuery("");
            setVideos([]);
            setSourceResults([]);
          }
        );
      } else {
        // Add mode: Create new overlay
        const adaptor = videoAdaptors.find((a) => a.name === video._source);
        const videoUrl = (video as any)._isLocalMedia
          ? ((video as any)._localSrc || video.videoFiles?.[0]?.url || "")
          : (adaptor?.getVideoUrl(video, "hd") || "");

        // Get actual video duration using media-parser
        let durationInFrames = 200; // fallback
        let mediaSrcDuration: number | undefined;
        
        try {
          const result = await getSrcDuration(videoUrl);
          durationInFrames = result.durationInFrames;
          mediaSrcDuration = result.durationInSeconds;
        } catch (error) {
          console.warn("Failed to get video duration, using fallback:", error);
        }

        const canvasDimensions = getAspectRatioDimensions();
        const assetDimensions = getAssetDimensions(video);
        
        // Use intelligent sizing if asset dimensions are available, otherwise fall back to canvas dimensions
        const { width, height } = assetDimensions 
          ? calculateIntelligentAssetSize(assetDimensions, canvasDimensions)
          : canvasDimensions;
        
        const { from, row, updatedOverlays } = addAtPlayhead(
          currentFrame,
          overlays,
          'top'
        );

        // Create the new overlay without an ID (will be generated)
        const newOverlay = {
          left: 0,
          top: 0,
          width,
          height,
          durationInFrames,
          from,
          rotation: 0,
          row,
          isDragging: false,
          type: OverlayType.VIDEO,
          content: video.thumbnail,
          src: videoUrl,
          videoStartTime: 0,
          mediaSrcDuration,
          styles: {
            opacity: 1,
            zIndex: 100,
            transform: "none",
            objectFit: "contain",
            animation: {
              enter: "none",
              exit: "none",
            },
          },
        };

        // Update overlays with both the shifted overlays and the new overlay in a single operation
        const newId = updatedOverlays.length > 0 ? Math.max(...updatedOverlays.map((o) => o.id)) + 1 : 0;
        const overlayWithId = { ...newOverlay, id: newId } as Overlay;
        const finalOverlays = [...updatedOverlays, overlayWithId];
        
        setOverlays(finalOverlays);
        setSelectedOverlayId(newId);
      }
    } finally {
      setIsDurationLoading(false);
      setLoadingItemKey(null);
    }
  };

  const handleUpdateOverlay = (updatedOverlay: Overlay) => {
    setLocalOverlay(updatedOverlay);
    changeOverlay(updatedOverlay.id, () => updatedOverlay);
  };

  const handleCancelReplace = () => {
    cancelReplaceMode();
    setSearchQuery("");
    setVideos([]);
    setSourceResults([]);
  };

  const getThumbnailUrl = (video: StandardVideo & { _source: string; _sourceDisplayName: string }) => {
    return video.thumbnail;
  };

  const getItemKey = (video: StandardVideo & { _source: string; _sourceDisplayName: string }) => {
    return `${video._source}-${video.id}`;
  };

  return (
    <MediaOverlayPanel
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onSearch={handleSearch}
      items={videos}
      isLoading={isLoading}
      isDurationLoading={isDurationLoading}
      loadingItemKey={loadingItemKey}
      hasAdaptors={videoAdaptors.length > 0}
      sourceResults={sourceResults}
      onItemClick={handleAddClip}
      getThumbnailUrl={getThumbnailUrl}
      getItemKey={getItemKey}
      mediaType="videos"
      searchPlaceholder={isReplaceMode ? "Search for replacement video" : "Search videos"}
      showSourceBadge={false}
      isEditMode={!!localOverlay && !isReplaceMode}
      editComponent={
        localOverlay ? (
          <VideoDetails
            localOverlay={localOverlay as ClipOverlay}
            setLocalOverlay={handleUpdateOverlay}
            onChangeVideo={startReplaceMode}
          />
        ) : null
      }
      isReplaceMode={isReplaceMode}
      onCancelReplace={handleCancelReplace}
      enableTimelineDrag={!isReplaceMode && !localOverlay}
      currentPage={currentPage}
      totalPages={Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
      onPageChange={handlePageChange}
    />
  );
};
