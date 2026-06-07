"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { authFetch } from "@/lib/auth-fetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X } from "lucide-react";

interface PendingPDF {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  folder: {
    name: string;
  };
  category?: {
    id?: string;
    name: string;
  };
  tags: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
}

export default function AdminLibraryDashboard() {
  const t = useTranslations("library");
  const tc = useTranslations("common");
  const params = useParams();
  const brandId = params.brandId as string;

  const [pdfs, setPdfs] = useState<PendingPDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPdf, setSelectedPdf] = useState<PendingPDF | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    fetchPendingPdfs();
  }, [brandId]);

  const fetchPendingPdfs = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/brands/${brandId}/library/pending`);
      if (res.ok) {
        const data = await res.json();
        setPdfs(data.pdfs || []);
      }
    } catch (error) {
      console.error("Error fetching pending PDFs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (pdf: PendingPDF) => {
    setActionLoading(true);
    try {
      const res = await authFetch(
        `/api/brands/${brandId}/library/${pdf.id}/approve`,
        { method: "POST" }
      );

      if (res.ok) {
        setPdfs(pdfs.filter((p) => p.id !== pdf.id));
        alert(t("approved_success"));
      } else {
        alert(t("approval_failed"));
      }
    } catch (error) {
      console.error("Error approving PDF:", error);
      alert(t("approval_error"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClick = (pdf: PendingPDF) => {
    setSelectedPdf(pdf);
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!selectedPdf || !rejectionReason) {
      alert(t("rejection_reason_required"));
      return;
    }

    setActionLoading(true);
    try {
      const res = await authFetch(
        `/api/brands/${brandId}/library/${selectedPdf.id}/reject`,
        {
          method: "POST",
          body: JSON.stringify({ reason: rejectionReason }),
        }
      );

      if (res.ok) {
        setPdfs(pdfs.filter((p) => p.id !== selectedPdf.id));
        setShowRejectDialog(false);
        setRejectionReason("");
        setSelectedPdf(null);
        alert(t("rejected_success"));
      } else {
        alert(t("rejection_failed"));
      }
    } catch (error) {
      console.error("Error rejecting PDF:", error);
      alert(t("rejection_error"));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">{t("approval_dashboard")}</h1>
        <p className="text-muted-foreground mt-2">{t("pending_pdfs_count", { count: pdfs.length })}</p>
      </div>

      {pdfs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">{t("no_pending_pdfs")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pdfs.map((pdf) => (
            <Card key={pdf.id} className="p-6">
              <div className="space-y-4">
                {/* Title and Folder */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{pdf.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Folder: <span className="font-medium">{pdf.folder.name}</span>
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(pdf.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Description */}
                {pdf.description && (
                  <p className="text-sm text-gray-600">{pdf.description}</p>
                )}

                {/* Category and Tags */}
                <div className="flex flex-wrap gap-2">
                  {pdf.category && (
                    <Badge variant="secondary">{pdf.category.name}</Badge>
                  )}
                  {pdf.tags.map((t) => (
                    <Badge key={t.tag.id} variant="outline">
                      {t.tag.name}
                    </Badge>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => handleApprove(pdf)}
                    disabled={actionLoading}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    {t("approve")}
                  </Button>
                  <Button
                    onClick={() => handleRejectClick(pdf)}
                    variant="destructive"
                    disabled={actionLoading}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    {t("reject")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reject_pdf")}</DialogTitle>
            <DialogDescription>
              {t("reject_reason_description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedPdf && (
              <div>
                <Label className="text-sm font-medium">{t("pdf_title")}</Label>
                <p className="text-sm text-muted-foreground">{selectedPdf.title}</p>
              </div>
            )}

            <div>
              <Label htmlFor="rejection-reason">{t("rejection_reason")} *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("rejection_reason_placeholder")}
                disabled={actionLoading}
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason("");
                }}
                disabled={actionLoading}
                className="flex-1"
              >
                {tc("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason}
                className="flex-1"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t("rejecting")}
                  </>
                ) : (
                  t("reject")
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
