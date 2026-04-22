import React, { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { Trash2, AlertTriangle, MessageSquare, Heart, RefreshCcw, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageLightbox } from '../../components/Shared/ImageLightbox';

const GET_GLOBAL_FEED_ADMIN = gql`
  query GetGlobalFeedAdmin {
    getGlobalFeed {
      id
      authorId
      contentText
      postType
      isSystem
      isPinned
      reactions
      metadata
      createdAt
    }
  }
`;

const DELETE_FEED_POST = gql`
  mutation DeleteFeedPostAdmin($postId: String!) {
    deleteFeedPost(postId: $postId)
  }
`;

export default function FeedMonitoring() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { data, loading, refetch } = useQuery(GET_GLOBAL_FEED_ADMIN, {
    pollInterval: 15000,
  });

  const [deletePost] = useMutation(DELETE_FEED_POST, {
    onCompleted: () => refetch(),
  });

  const handleDelete = (postId: string) => {
    if (confirm('Bu gönderiyi silmek istediğinizden emin misiniz?')) {
      deletePost({ variables: { postId } });
    }
  };

  const posts = data?.getGlobalFeed || [];
  
  const filteredPosts = posts.filter((p: any) => 
    p.contentText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.metadata?.attachments && p.metadata.attachments.length > 0 && searchTerm.toLowerCase() === 'has:image')
  );

  return (
    <>
      <div className="space-y-6 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-electric-blue" />
              İçerik Denetimi ve Akış (Feed)
            </h1>
            <p className="text-gray-500 mt-2 text-sm font-mono">
               Sistem üzerindeki tüm gönderilerin ve medyaların merkezi denetimi
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => refetch()}
              className="p-2.5 bg-dark-surface border border-dark-border rounded-lg text-gray-400 hover:text-white hover:border-electric-blue/50 transition-all"
              title="Yenile"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="bg-dark-surface border border-dark-border rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
          <input 
            type="text"
            placeholder="İçerik ara... (Resimleri görmek için 'has:image' yazın)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-[#0d1117] border border-dark-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-electric-blue transition-colors w-full"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPosts.map((post: any) => {
               const likes = post.reactions?.['👍']?.length || 0;
               const attachments = post.metadata?.attachments || [];
               
               return (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-dark-surface border border-dark-border rounded-xl p-5 flex flex-col hover:border-electric-blue/30 transition-colors shadow-lg relative overflow-hidden"
                >
                  {post.isSystem && (
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-mint to-electric-blue" />
                  )}
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs font-bold text-gray-300">Yazar: {post.authorId.substring(0,8)}...</span>
                      <div className="text-[10px] text-gray-500 font-mono mt-1">
                        {new Date(post.createdAt).toLocaleString('tr-TR')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {post.isSystem && <span className="text-[9px] px-2 py-0.5 bg-neon-mint/10 text-neon-mint border border-neon-mint/20 rounded">SİSTEM</span>}
                      <button 
                        onClick={() => handleDelete(post.id)}
                        className="text-gray-500 hover:text-coral-red bg-[#0d1117] border border-dark-border p-1.5 rounded"
                        title="Gönderiyi Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-sm text-gray-200 whitespace-pre-wrap line-clamp-4">
                      {post.contentText}
                    </p>
                  </div>

                  {attachments.length > 0 && (
                     <div className="mt-4 grid grid-cols-2 gap-2">
                        {attachments.map((url: string, i: number) => (
                          <div 
                            key={i} 
                            className="aspect-video bg-black/40 border border-dark-border rounded overflow-hidden relative group cursor-zoom-in"
                            onClick={() => setSelectedImage(url)}
                          >
                             <ImageIcon className="absolute inset-0 m-auto text-gray-600 w-5 h-5 opacity-50" />
                             <img src={url} alt="Attachment" className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                          </div>
                        ))}
                     </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-dark-border flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-pink-500" />
                      <span>{likes} Beğeni</span>
                    </div>
                    <span className="uppercase text-[9px] font-mono opacity-50">{post.postType}</span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {filteredPosts.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center border border-dashed border-dark-border rounded-xl bg-dark-surface/50">
              <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 font-mono text-sm">Hiç gönderi bulunamadı.</p>
            </div>
          )}
        </div>
      </div>

      <ImageLightbox 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
    </>
  );
}
